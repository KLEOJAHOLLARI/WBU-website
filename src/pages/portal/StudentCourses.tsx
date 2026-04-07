import StudentLayout from "@/components/StudentLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { BookOpen, BarChart3, ClipboardCheck } from "lucide-react";

const StudentCourses = () => {
  const { user } = useAuth();

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["student-enrollments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("*, courses(*)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const { data: attendanceData = [] } = useQuery({
    queryKey: ["student-all-attendance", user?.id],
    queryFn: async () => {
      const enrollmentIds = enrollments.map((e) => e.id);
      if (enrollmentIds.length === 0) return [];
      const { data, error } = await supabase.from("attendance_records").select("*, attendance_sessions(*)").in("enrollment_id", enrollmentIds);
      if (error) throw error;
      return data as any[];
    },
    enabled: enrollments.length > 0,
  });

  const { data: allSessions = [] } = useQuery({
    queryKey: ["student-all-sessions", user?.id],
    queryFn: async () => {
      const courseIds = enrollments.map((e) => e.course_id);
      if (courseIds.length === 0) return [];
      const { data, error } = await supabase.from("attendance_sessions").select("*").in("course_id", courseIds);
      if (error) throw error;
      return data;
    },
    enabled: enrollments.length > 0,
  });

  const { data: gradesData = [] } = useQuery({
    queryKey: ["student-all-grades", user?.id],
    queryFn: async () => {
      const enrollmentIds = enrollments.map((e) => e.id);
      if (enrollmentIds.length === 0) return [];
      const { data, error } = await supabase.from("grades").select("*, grade_components(*)").in("enrollment_id", enrollmentIds);
      if (error) throw error;
      return data as any[];
    },
    enabled: enrollments.length > 0,
  });

  const getAttendancePct = (enrollmentId: string, courseId: string) => {
    const courseSessions = allSessions.filter((s) => s.course_id === courseId);
    if (courseSessions.length === 0) return null;
    const present = attendanceData.filter((r) => r.enrollment_id === enrollmentId && r.status === "present").length;
    return Math.round((present / courseSessions.length) * 100);
  };

  return (
    <StudentLayout>
      <h1 className="font-display text-2xl font-bold text-foreground">My Courses</h1>
      <p className="text-sm text-muted-foreground">View your enrolled courses, grades, and attendance</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : enrollments.length === 0 ? (
          <div className="col-span-full rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            You are not enrolled in any courses yet.
          </div>
        ) : (
          enrollments.map((enr) => {
            const course = enr.courses;
            const attPct = getAttendancePct(enr.id, enr.course_id);
            const courseGrades = gradesData.filter((g) => g.enrollment_id === enr.id);
            const hasGrades = courseGrades.some((g) => g.score !== null);

            return (
              <Link
                key={enr.id}
                to={`/portal/courses/${enr.course_id}`}
                className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start gap-3">
                  <BookOpen className="mt-0.5 h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-foreground">{course?.name || "Course"}</h3>
                    <p className="text-xs text-muted-foreground">{course?.code} · {course?.program}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                    <span className={attPct !== null && attPct < 75 ? "font-semibold text-destructive" : "text-muted-foreground"}>
                      {attPct !== null ? `${attPct}%` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{hasGrades ? "Graded" : "—"}</span>
                  </div>
                </div>

                {attPct !== null && attPct < 75 && (
                  <p className="mt-2 rounded bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
                    ⚠ Attendance below 75% — final exam blocked
                  </p>
                )}

                {course?.syllabus_url && (
                  <p className="mt-2 text-xs text-primary hover:underline">📄 Syllabus available</p>
                )}
              </Link>
            );
          })
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentCourses;
