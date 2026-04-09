import StudentLayout from "@/components/StudentLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { BookOpen, BarChart3, ClipboardCheck, Lock } from "lucide-react";

const StudentCourses = () => {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["student-profile-program", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("program").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

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

  // Fetch all courses in the student's program
  const { data: programCourses = [] } = useQuery({
    queryKey: ["program-courses", profile?.program],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("program", profile!.program!)
        .order("year")
        .order("semester")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.program,
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

  const enrolledCourseIds = enrollments.map((e) => e.course_id);

  const getAttendancePct = (enrollmentId: string, courseId: string) => {
    const courseSessions = allSessions.filter((s) => s.course_id === courseId);
    if (courseSessions.length === 0) return null;
    const present = attendanceData.filter((r) => r.enrollment_id === enrollmentId && r.status === "present").length;
    return Math.round((present / courseSessions.length) * 100);
  };

  const renderEnrolledCard = (enr: any) => {
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
            <p className="text-xs text-muted-foreground">{course?.code} · Year {course?.year} · Sem {course?.semester}</p>
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
          <p className="mt-2 text-xs text-primary">📄 Syllabus available</p>
        )}
      </Link>
    );
  };

  return (
    <StudentLayout>
      <h1 className="font-display text-2xl font-bold text-foreground">My Courses</h1>
      <p className="text-sm text-muted-foreground">View your enrolled courses, grades, and attendance</p>

      {/* Enrolled courses */}
      <h2 className="mt-6 mb-3 font-display text-lg font-semibold text-foreground">Enrolled Courses</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : enrollments.length === 0 ? (
          <div className="col-span-full rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            You are not enrolled in any courses yet.
          </div>
        ) : (
          enrollments.map(renderEnrolledCard)
        )}
      </div>

      {/* Program courses */}
      {profile?.program && programCourses.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 font-display text-lg font-semibold text-foreground">
            All Program Courses
            <span className="ml-2 text-sm font-normal text-muted-foreground">({profile.program})</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {programCourses.map((course) => {
              const isEnrolled = enrolledCourseIds.includes(course.id);
              return (
                <div
                  key={course.id}
                  className={`rounded-xl border p-5 ${
                    isEnrolled
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-card opacity-75"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {isEnrolled ? (
                      <BookOpen className="mt-0.5 h-5 w-5 text-primary" />
                    ) : (
                      <Lock className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-display font-semibold text-foreground">{course.name}</h3>
                      <p className="text-xs text-muted-foreground">{course.code} · Year {course.year} · Sem {course.semester}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {isEnrolled ? "✓ Enrolled" : "Not enrolled"}
                  </p>
                  {course.syllabus_url && (
                    <a href={course.syllabus_url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs text-primary hover:underline">
                      📄 View Syllabus
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!profile?.program && !isLoading && (
        <div className="mt-8 rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No program assigned yet. Contact administration to get assigned to a program.
        </div>
      )}
    </StudentLayout>
  );
};

export default StudentCourses;
