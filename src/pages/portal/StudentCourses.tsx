import { useState } from "react";
import StudentLayout from "@/components/StudentLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { BookOpen, BarChart3, ClipboardCheck, Lock, Plus, Clock, CheckCircle, XCircle, X } from "lucide-react";

const StudentCourses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showAddCourses, setShowAddCourses] = useState(false);

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

  // Fetch enrollment requests
  const { data: enrollmentRequests = [] } = useQuery({
    queryKey: ["student-enrollment-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollment_requests")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const requestMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase
        .from("enrollment_requests")
        .insert({ user_id: user!.id, course_id: courseId } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-enrollment-requests"] });
      toast({ title: "Enrollment request submitted!", description: "Your academic advisor will review it." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
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

  const getRequestStatus = (courseId: string) => {
    return enrollmentRequests.find((r) => r.course_id === courseId);
  };

  const requestStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle className="h-3 w-3" />Accepted</span>;
      case "rejected":
        return <span className="inline-flex items-center gap-1 text-xs text-destructive"><XCircle className="h-3 w-3" />Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-xs text-amber-600"><Clock className="h-3 w-3" />Pending</span>;
    }
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
      </Link>
    );
  };

  // Available courses = program courses not already enrolled and not already requested
  const availableCourses = programCourses.filter(
    (c) => !enrolledCourseIds.includes(c.id)
  );

  return (
    <StudentLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">My Courses</h1>
          <p className="text-sm text-muted-foreground">View your enrolled courses, grades, and attendance</p>
        </div>
        {profile?.program && availableCourses.length > 0 && (
          <button
            onClick={() => setShowAddCourses(!showAddCourses)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            {showAddCourses ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showAddCourses ? "Close" : "Add Courses"}
          </button>
        )}
      </div>

      {/* Add Courses Panel */}
      {showAddCourses && (
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-6">
          <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Available Courses</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Request enrollment in courses from your program. Your academic advisor will review and approve.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {availableCourses.map((course) => {
              const request = getRequestStatus(course.id);
              return (
                <div key={course.id} className="rounded-lg border border-border bg-card p-4">
                  <h3 className="font-display font-semibold text-foreground text-sm">{course.name}</h3>
                  <p className="text-xs text-muted-foreground">{course.code} · Y{course.year}/S{course.semester}</p>
                  <div className="mt-3">
                    {request ? (
                      <div className="flex items-center gap-2">
                        {requestStatusBadge(request.status)}
                      </div>
                    ) : (
                      <button
                        onClick={() => requestMutation.mutate(course.id)}
                        disabled={requestMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
                      >
                        <Plus className="h-3 w-3" /> Request Enrollment
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Enrollment Requests Status */}
      {enrollmentRequests.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-display text-sm font-semibold text-foreground">Enrollment Requests</h2>
          <div className="flex flex-wrap gap-2">
            {enrollmentRequests.map((r) => {
              const course = programCourses.find((c) => c.id === r.course_id);
              return (
                <div key={r.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
                  <span className="font-medium text-foreground">{course?.name || "Course"}</span>
                  {requestStatusBadge(r.status)}
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {/* All Program Courses */}
      {profile?.program && programCourses.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 font-display text-lg font-semibold text-foreground">
            All Program Courses
            <span className="ml-2 text-sm font-normal text-muted-foreground">({profile.program})</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {programCourses.map((course) => {
              const isEnrolled = enrolledCourseIds.includes(course.id);
              const request = getRequestStatus(course.id);
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
                    {isEnrolled ? "✓ Enrolled" : request ? requestStatusBadge(request.status) : "Not enrolled"}
                  </p>
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
