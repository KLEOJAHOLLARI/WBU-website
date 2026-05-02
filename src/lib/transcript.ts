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

export function buildTranscriptRows(
  enrollments: TranscriptEnrollment[],
  grades: TranscriptGradeRow[],
  components: TranscriptComponent[]
): TranscriptRow[] {
  // Deduplicate enrollments by course_id — keep the first one encountered.
  // Prevents duplicate transcript rows when a student has multiple enrollment records
  // for the same course (legacy data, re-enrollments, etc.).
  const seenCourseIds = new Set<string>();
  const unique: TranscriptEnrollment[] = [];
  for (const e of enrollments) {
    if (!e.courses) continue;
    if (seenCourseIds.has(e.course_id)) continue;
    seenCourseIds.add(e.course_id);
    unique.push(e);
  }

  return unique
    .map((enrollment) => {
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

        // Course is "Completed" only when every component has at least one recorded score.
        isComplete = gradedComponents === courseComponents.length && totalWeight > 0;

        if (isComplete) {
          weightedTotal = weightedSum / totalWeight;
        }
      }

      const status: TranscriptRow["status"] =
        weightedTotal === null
          ? "In Progress"
          : weightedTotal >= 45
          ? "Passed"
          : "Failed";

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
      };
    })
    .sort(
      (a, b) =>
        a.year - b.year ||
        a.semester - b.semester ||
        a.courseName.localeCompare(b.courseName)
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
  const completed = rows.filter((r) => r.isComplete && r.grade !== null);
  const passed = completed.filter((r) => r.status === "Passed");
  const inProgress = rows.filter((r) => !r.isComplete);

  const totalECTS = passed.reduce((s, r) => s + r.ects, 0);
  const totalCredits = rows.reduce((s, r) => s + r.ects, 0);

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
    totalCourses: rows.length,
    passedCourses: passed.length,
    completedCourses: completed.length,
    inProgressCourses: inProgress.length,
  };
}
