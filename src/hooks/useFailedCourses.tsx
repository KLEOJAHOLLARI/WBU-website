import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { buildTranscriptRows } from "@/lib/transcript";

/**
 * Returns the user's failed courses (latest attempt that has a final
 * weighted grade strictly below 45% / Albanian ≤ 4 / letter F).
 *
 * Implemented client-side from the same data the transcript uses, so the
 * pass/fail rule always matches the transcript page exactly.
 */
export type FailedCourse = {
  enrollmentId: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  semester: number;
  year: number;
  ects: number;
  grade: number; // weighted percentage
  attemptNumber: number;
};

export function useFailedCourses() {
  const { user } = useAuth();

  return useQuery<FailedCourse[]>({
    queryKey: ["failed-courses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const uid = user!.id;

      const [{ data: enrollments }, { data: components }] = await Promise.all([
        supabase
          .from("enrollments")
          .select(
            "id, course_id, attempt_number, courses:courses!enrollments_course_id_fkey(id, name, code, semester, year, ects)"
          )
          .eq("user_id", uid),
        supabase.from("grade_components").select("id, course_id, weight, count"),
      ]);

      const enrollmentIds = (enrollments || []).map((e: any) => e.id);
      let grades: any[] = [];
      if (enrollmentIds.length) {
        const { data: g } = await supabase
          .from("grades")
          .select("enrollment_id, grade_component_id, score, max_score")
          .in("enrollment_id", enrollmentIds);
        grades = g || [];
      }

      // We DO want duplicates per attempt, so we cannot use buildTranscriptRows
      // directly (it dedupes by course). Compute per-enrollment, then keep the
      // failed *latest* attempt for each course.
      const rows = (enrollments || []).map((e: any) => {
        const tr = buildTranscriptRows(
          [{ id: e.id, course_id: e.course_id, courses: e.courses }],
          grades.filter((g) => g.enrollment_id === e.id),
          (components || []).map((c: any) => ({
            id: c.id,
            course_id: c.course_id,
            weight: c.weight,
            count: c.count,
          })),
        );
        const r = tr[0];
        return r
          ? {
              enrollmentId: e.id,
              courseId: r.courseId,
              courseName: r.courseName,
              courseCode: r.courseCode,
              semester: r.semester,
              year: r.year,
              ects: r.ects,
              grade: r.grade ?? null,
              status: r.status,
              attemptNumber: e.attempt_number ?? 1,
              isComplete: r.isComplete,
            }
          : null;
      }).filter(Boolean) as any[];

      // Keep the latest attempt per course
      const byCourse = new Map<string, any>();
      for (const r of rows) {
        const prev = byCourse.get(r.courseId);
        if (!prev || r.attemptNumber > prev.attemptNumber) {
          byCourse.set(r.courseId, r);
        }
      }

      return Array.from(byCourse.values())
        .filter(
          (r) => r.isComplete && r.status === "Failed" && typeof r.grade === "number",
        )
        .map((r) => ({
          enrollmentId: r.enrollmentId,
          courseId: r.courseId,
          courseName: r.courseName,
          courseCode: r.courseCode,
          semester: r.semester,
          year: r.year,
          ects: r.ects,
          grade: r.grade as number,
          attemptNumber: r.attemptNumber,
        }));
    },
  });
}

/** Retake settings stored in `system_settings` under key `retake_settings`. */
export type RetakeSettings = {
  enabled: boolean;
  max_attempts: number;
  fee_amount: number;
  fee_currency: string;
};

export function useRetakeSettings() {
  return useQuery<RetakeSettings>({
    queryKey: ["retake-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "retake_settings")
        .maybeSingle();
      const v = (data?.value as any) || {};
      return {
        enabled: v.enabled ?? true,
        max_attempts: Number(v.max_attempts ?? 3),
        fee_amount: Number(v.fee_amount ?? 0),
        fee_currency: String(v.fee_currency ?? "EUR"),
      };
    },
  });
}
