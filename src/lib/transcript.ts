// Shared transcript calculation logic
// Source of truth: enrollments -> courses -> grade_components -> grades
// A course is "Completed" only when ALL its grade components have at least one recorded score.
// Otherwise it's "In Progress".
// Passing threshold: weighted percentage >= 45 (Albanian scale: grade 5 and above).
//
// All percent → letter / GPA conversions are delegated to `lib/grading.ts`
// so the entire app shares the same official scale.

import { percentToAlbanian, percentToGPA, percentToLetter } from "./grading";

export interface TranscriptEnrollment {
  id: string;
  course_id: string;
  attempt_number?: number | null;
  is_retake?: boolean | null;
  courses: {
    id: string;
    name: string;
    code: string | null;
    semester: number;
    year: number;
    ects: number | null;
  } | null;
}

export interface TranscriptGradeRow {
  enrollment_id: string;
  grade_component_id: string;
  score: number | null;
  max_score: number;
}

export interface TranscriptComponent {
  id: string;
  course_id: string;
  weight: number | string;
  count?: number;
}

export interface TranscriptRow {
  enrollmentId: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  semester: number;
  year: number;
  ects: number;
  grade: number | null; // weighted percentage 0-100
  status: "Passed" | "Failed" | "In Progress";
  isComplete: boolean; // true only when every component has a score
  attemptNumber: number;
  isRetake: boolean;
  isLatestAttempt: boolean; // true if this is the latest attempt for the course
}

// Re-exported from the centralized grading module so callers don't need to switch imports.
export const gradeToLetter = (grade: number): string => percentToLetter(grade);
export const gradeToGPA = (grade: number): number => percentToGPA(grade);
export const gradeToAlbanian = (grade: number): number => percentToAlbanian(grade);

/**
 * Build transcript rows.
 *
 * By default, ALL attempts for a course are returned (one row per enrollment),
 * so retake history is preserved. The latest attempt of each course is marked
 * `isLatestAttempt: true`. Pass `{ keepAllAttempts: false }` to collapse to
 * the highest-attempt enrollment per course (legacy behaviour).
 */
export function buildTranscriptRows(
  enrollments: TranscriptEnrollment[],
  grades: TranscriptGradeRow[],
  components: TranscriptComponent[],
  options: { keepAllAttempts?: boolean } = {}
): TranscriptRow[] {
  const keepAll = options.keepAllAttempts !== false;

  const cleaned: TranscriptEnrollment[] = enrollments.filter((e) => !!e.courses);

  // Latest attempt per course_id (max attempt_number; default 1)
  const latestByCourse = new Map<string, number>();
  for (const e of cleaned) {
    const a = e.attempt_number ?? 1;
    const prev = latestByCourse.get(e.course_id) ?? 0;
    if (a > prev) latestByCourse.set(e.course_id, a);
  }

  let working: TranscriptEnrollment[];
  if (keepAll) {
    working = cleaned;
  } else {
    // Keep only the latest attempt per course
    const byCourse = new Map<string, TranscriptEnrollment>();
    for (const e of cleaned) {
      const a = e.attempt_number ?? 1;
      const cur = byCourse.get(e.course_id);
      const curA = cur?.attempt_number ?? 1;
      if (!cur || a > curA) byCourse.set(e.course_id, e);
    }
    working = Array.from(byCourse.values());
  }

  return working
    .map((enrollment): TranscriptRow => {
      const course = enrollment.courses!;
      const courseComponents = components.filter((c) => c.course_id === course.id);
      const enrollmentGrades = grades.filter((g) => g.enrollment_id === enrollment.id);

      let weightedTotal: number | null = null;
      let isComplete = false;

      if (courseComponents.length > 0) {
        let totalWeight = 0;
        let weightedSum = 0;
        let gradedComponents = 0;

        for (const comp of courseComponents) {
          const compGrades = enrollmentGrades.filter(
            (g) => g.grade_component_id === comp.id && g.score !== null
          );
          const weight = Number(comp.weight);
          if (compGrades.length > 0) {
            gradedComponents += 1;
            const avgScore =
              compGrades.reduce(
                (sum, g) => sum + (g.score! / (g.max_score || 100)) * 100,
                0
              ) / compGrades.length;
            weightedSum += avgScore * weight;
            totalWeight += weight;
          }
        }

        isComplete = gradedComponents === courseComponents.length && totalWeight > 0;
        if (isComplete) weightedTotal = weightedSum / totalWeight;
      }

      const status: TranscriptRow["status"] =
        weightedTotal === null
          ? "In Progress"
          : weightedTotal >= 45
          ? "Passed"
          : "Failed";

      const attemptNumber = enrollment.attempt_number ?? 1;

      return {
        enrollmentId: enrollment.id,
        courseId: course.id,
        courseName: course.name,
        courseCode: course.code || "",
        semester: course.semester,
        year: course.year,
        ects: course.ects ?? 6,
        grade:
          weightedTotal !== null ? Math.round(weightedTotal * 100) / 100 : null,
        status,
        isComplete,
        attemptNumber,
        isRetake: !!enrollment.is_retake || attemptNumber > 1,
        isLatestAttempt: attemptNumber === (latestByCourse.get(course.id) ?? 1),
      };
    })
    .sort(
      (a, b) =>
        a.year - b.year ||
        a.semester - b.semester ||
        a.courseName.localeCompare(b.courseName) ||
        a.attemptNumber - b.attemptNumber
    );
}

export interface TranscriptSummary {
  totalECTS: number; // passed ECTS (earned)
  totalInstitutionalCredits: number; // sum of ECTS across all rows (enrolled)
  totalTransferCredits: number;
  cgpa: number;            // 0.00 – 4.00 (US-style)
  gpaAlbanian: number;     // 4.00 – 10.00 (Albanian scale, ECTS-weighted average of converted grades)
  weightedAvg: number;     // 0 – 100 (raw weighted percentage)
  totalCourses: number;
  passedCourses: number;
  completedCourses: number;
  inProgressCourses: number;
}

export function computeTranscriptSummary(
  rows: TranscriptRow[]
): TranscriptSummary {
  // Use only the latest attempt per course for stats so retake history isn't double-counted.
  // (Rows without explicit attempt info will all have isLatestAttempt=true.)
  const latest = rows.filter((r) => r.isLatestAttempt !== false);

  const completed = latest.filter((r) => r.isComplete && r.grade !== null);
  const passed = completed.filter((r) => r.status === "Passed");
  const inProgress = latest.filter((r) => !r.isComplete);

  const totalECTS = passed.reduce((s, r) => s + r.ects, 0);
  const totalCredits = latest.reduce((s, r) => s + r.ects, 0);

  let cgpa = 0;
  let weightedAvg = 0;
  let gpaAlbanian = 0;
  if (completed.length > 0) {
    const totalEctsGraded = completed.reduce((s, r) => s + r.ects, 0);
    if (totalEctsGraded > 0) {
      cgpa =
        completed.reduce((s, r) => s + gradeToGPA(r.grade!) * r.ects, 0) /
        totalEctsGraded;
      weightedAvg =
        completed.reduce((s, r) => s + r.grade! * r.ects, 0) / totalEctsGraded;
      gpaAlbanian =
        completed.reduce((s, r) => s + gradeToAlbanian(r.grade!) * r.ects, 0) /
        totalEctsGraded;
    }
  }

  return {
    totalECTS,
    totalInstitutionalCredits: totalCredits,
    totalTransferCredits: 0,
    cgpa: Math.round(cgpa * 100) / 100,
    gpaAlbanian: Math.round(gpaAlbanian * 100) / 100,
    weightedAvg: Math.round(weightedAvg * 100) / 100,
    totalCourses: latest.length,
    passedCourses: passed.length,
    completedCourses: completed.length,
    inProgressCourses: inProgress.length,
  };
}
