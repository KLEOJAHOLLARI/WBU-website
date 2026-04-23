import { useState, useMemo } from "react";
import StudentLayout from "@/components/StudentLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, BarChart3, ClipboardCheck, Lock, Plus, Clock, CheckCircle, XCircle, X, GraduationCap, Building2, ChevronDown, ChevronRight, User, FileText, ExternalLink, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useActiveSemester } from "@/hooks/useActiveSemester";
import SemesterBadge from "@/components/SemesterBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

const StudentCourses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showAddCourses, setShowAddCourses] = useState(false);
  const [collapsedFaculties, setCollapsedFaculties] = useState<Record<string, boolean>>({});

  const { data: profile } = useQuery({
    queryKey: ["student-profile-program", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("program, current_year, current_semester").eq("user_id", user!.id).maybeSingle();
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

  const { data: programData } = useQuery({
    queryKey: ["student-program-info", profile?.program],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("slug, title, faculty")
        .eq("slug", profile!.program!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.program,
  });

  const { data: programCourses = [] } = useQuery({
    queryKey: ["program-courses", profile?.program],
    queryFn: async () => {
      // Fetch program-specific courses
      const { data: ownCourses, error: e1 } = await supabase
        .from("courses")
        .select("*")
        .eq("program", profile!.program!)
        .order("year")
        .order("semester")
        .order("name");
      if (e1) throw e1;

      // Fetch shared courses that include this program
      const { data: sharedLinks, error: e2 } = await supabase
        .from("course_shared_programs")
        .select("course_id")
        .eq("program_slug", profile!.program!);
      if (e2) throw e2;

      const sharedCourseIds = (sharedLinks || []).map(l => l.course_id);
      let sharedCourses: any[] = [];
      if (sharedCourseIds.length > 0) {
        const { data, error: e3 } = await supabase
          .from("courses")
          .select("*")
          .in("id", sharedCourseIds)
          .order("year")
          .order("semester")
          .order("name");
        if (e3) throw e3;
        sharedCourses = data || [];
      }

      // Merge, deduplicate by id
      const map = new Map<string, any>();
      (ownCourses || []).forEach(c => map.set(c.id, c));
      sharedCourses.forEach(c => map.set(c.id, c));
      return Array.from(map.values()).sort((a, b) => a.year - b.year || a.semester - b.semester || a.name.localeCompare(b.name));
    },
    enabled: !!profile?.program,
  });

  // Collect all professor_ids from enrolled + program courses
  const allCourses = [...enrollments.map((e: any) => e.courses), ...programCourses].filter(Boolean);
  const professorIds = [...new Set(allCourses.map((c: any) => c?.professor_id).filter(Boolean))] as string[];
  const sortedProfessorIds = [...professorIds].sort();

  // Fetch from profiles (primary) and professors table (fallback) in parallel
  const {
    data: professorProfiles = [],
    isLoading: isProfessorProfilesLoading,
  } = useQuery({
    queryKey: ["professor-profiles-for-courses", sortedProfessorIds],
    queryFn: async () => {
      const [profilesRes, professorsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", sortedProfessorIds),
        supabase.from("professors").select("id, name, photo_url").in("id", sortedProfessorIds),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (professorsRes.error) throw professorsRes.error;

      const profileMap = new Map<string, { id: string; name: string; avatar_url: string | null }>();

      (professorsRes.data || []).forEach((p) => {
        if (p.name?.trim()) profileMap.set(p.id, { id: p.id, name: p.name.trim(), avatar_url: p.photo_url ?? null });
      });

      (profilesRes.data || []).forEach((p) => {
        if (p.full_name?.trim()) profileMap.set(p.user_id, { id: p.user_id, name: p.full_name.trim(), avatar_url: p.avatar_url ?? null });
      });

      return Array.from(profileMap.entries()).map(([userId, info]) => ({
        user_id: userId,
        full_name: info.name,
        avatar_url: info.avatar_url,
      }));
    },
    enabled: sortedProfessorIds.length > 0,
  });

  const getProfessor = (professorId: string | null) => {
    if (!professorId) return null;
    const professor = professorProfiles.find((p) => p.user_id === professorId && p.full_name?.trim());
    if (!professor) return null;
    return {
      id: professor.user_id,
      name: professor.full_name.trim(),
      avatar_url: professor.avatar_url ?? null,
    };
  };

  const renderProfessorMeta = (professorId: string | null, stopCardNavigation = false) => {
    if (!professorId) {
      return <p className="mt-1 text-xs italic text-muted-foreground">No professor assigned</p>;
    }

    if (isProfessorProfilesLoading) {
      return <p className="mt-1 text-xs text-muted-foreground">Loading professor...</p>;
    }

    const professor = getProfessor(professorId);

    if (!professor) {
      return <p className="mt-1 text-xs italic text-muted-foreground">Professor profile unavailable</p>;
    }

    const initials = professor.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

    return (
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <Avatar className="h-5 w-5">
            {professor.avatar_url && <AvatarImage src={professor.avatar_url} alt={professor.name} />}
            <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <span className="truncate text-foreground">{professor.name}</span>
        </div>
        <Link
          to={`/professors/${professor.id}`}
          onClick={stopCardNavigation ? (e) => e.stopPropagation() : undefined}
          className="shrink-0 text-xs font-medium text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
        >
          View Profile
        </Link>
      </div>
    );
  };

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

  const enrollmentIds = enrollments.map((e) => e.id);
  const enrolledCourseIds = enrollments.map((e) => e.course_id);

  const { data: attendanceData = [] } = useQuery({
    queryKey: ["student-all-attendance", user?.id, enrollmentIds],
    queryFn: async () => {
      if (enrollmentIds.length === 0) return [];
      const { data, error } = await supabase.from("attendance_records").select("*, attendance_sessions(*)").in("enrollment_id", enrollmentIds);
      if (error) throw error;
      return data as any[];
    },
    enabled: enrollmentIds.length > 0,
  });

  const { data: allSessions = [] } = useQuery({
    queryKey: ["student-all-sessions", user?.id, enrolledCourseIds],
    queryFn: async () => {
      if (enrolledCourseIds.length === 0) return [];
      const { data, error } = await supabase.from("attendance_sessions").select("*").in("course_id", enrolledCourseIds);
      if (error) throw error;
      return data;
    },
    enabled: enrolledCourseIds.length > 0,
  });

  const { data: gradesData = [] } = useQuery({
    queryKey: ["student-all-grades", user?.id, enrollmentIds],
    queryFn: async () => {
      if (enrollmentIds.length === 0) return [];
      const { data, error } = await supabase.from("grades").select("*, grade_components(*)").in("enrollment_id", enrollmentIds);
      if (error) throw error;
      return data as any[];
    },
    enabled: enrollmentIds.length > 0,
  });

  const getAttendancePct = (enrollmentId: string, courseId: string) => {
    const courseSessions = allSessions.filter((s) => s.course_id === courseId);
    if (courseSessions.length === 0) return null;
    const present = attendanceData.filter((r) => r.enrollment_id === enrollmentId && r.status === "present").length;
    return Math.round((present / courseSessions.length) * 100);
  };

  const getRequestStatus = (courseId: string) => {
    return enrollmentRequests.find((r) => r.course_id === courseId);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/25 hover:bg-emerald-500/15"><CheckCircle className="mr-1 h-3 w-3" />Accepted</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="bg-destructive/15 text-destructive border-destructive/25 hover:bg-destructive/15"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
      default:
        return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/25 hover:bg-amber-500/15"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
    }
  };

  const toggleFaculty = (faculty: string) => {
    setCollapsedFaculties((prev) => ({ ...prev, [faculty]: !prev[faculty] }));
  };

  // Group courses by year/semester
  const groupByYearSem = (courses: any[]) => {
    const groups: Record<string, any[]> = {};
    courses.forEach((c) => {
      const key = `Year ${c.year} · Semester ${c.semester}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return groups;
  };

  // Color palette for course code badges (cycles by index)
  const badgePalette = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
  ];
  const badgeColorFor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    return badgePalette[hash % badgePalette.length];
  };

  const renderEnrolledRow = (enr: any, index: number) => {
    const course = enr.courses;
    const attPct = getAttendancePct(enr.id, enr.course_id);
    const professor = getProfessor(course?.professor_id ?? null);
    const lowAttendance = attPct !== null && attPct < 75;
    const badgeColor = badgeColorFor(course?.id || String(index));
    const codeLabel = course?.code
      ? `${course.code}${course.semester ? ` · ${course.semester}` : ""}`
      : `Course ${index + 1}`;

    const stop = (e: React.MouseEvent) => e.stopPropagation();

    return (
      <div
        key={enr.id}
        onClick={() => navigate(`/portal/courses/${enr.course_id}`)}
        className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
      >
        <div className="flex flex-col sm:flex-row sm:items-stretch">
          {/* Left colored code badge */}
          <div
            className={`${badgeColor} flex shrink-0 items-center justify-center px-4 py-3 sm:w-32 sm:py-0`}
          >
            <span className="text-center font-display text-sm font-bold uppercase tracking-wide text-white">
              {codeLabel}
            </span>
          </div>

          {/* Middle: name + professor */}
          <div className="min-w-0 flex-1 px-4 py-4 sm:px-5">
            <h3 className="truncate font-display text-base font-semibold text-foreground transition-colors group-hover:text-primary">
              {course?.name || "Course"}
            </h3>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span className="truncate">
                {professor?.name || (course?.professor_id ? "Loading..." : "No professor assigned")}
              </span>
            </div>
            {lowAttendance && (
              <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                ⚠ Attendance below 75% — final exam blocked
              </p>
            )}
          </div>

          {/* Right action buttons */}
          <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3 sm:border-l sm:border-t-0 sm:px-4">
            <Link
              to={`/portal/courses/${enr.course_id}?tab=syllabus`}
              onClick={stop}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Syllabus
            </Link>
            <Link
              to={`/portal/courses/${enr.course_id}?tab=grades`}
              onClick={stop}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Grades
            </Link>
            <Link
              to={`/portal/courses/${enr.course_id}?tab=attendance`}
              onClick={stop}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                attPct === null
                  ? "border-border bg-background text-muted-foreground hover:bg-muted"
                  : lowAttendance
                  ? "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400"
              }`}
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              Attendance {attPct !== null ? `${attPct}%` : "—"}
            </Link>
          </div>
        </div>
      </div>
    );
  };

  const { data: activeSemester } = useActiveSemester();

  // Use active semester if available, otherwise fall back to profile
  const studentYear = activeSemester?.year ?? profile?.current_year ?? 1;
  const studentSemester = activeSemester?.semester ?? profile?.current_semester ?? 1;

  const visibleProgramCourses = programCourses.filter(c => {
    if (c.year > studentYear) return false;
    if (c.year === studentYear && c.semester > studentSemester) return false;
    return true;
  });

  const availableCourses = visibleProgramCourses.filter(
    (c) => !enrolledCourseIds.includes(c.id)
  );

  const yearSemGroups = groupByYearSem(visibleProgramCourses);

  const pendingCount = enrollmentRequests.filter((r) => r.status === "pending").length;
  const acceptedCount = enrollmentRequests.filter((r) => r.status === "accepted").length;
  const rejectedCount = enrollmentRequests.filter((r) => r.status === "rejected").length;

  return (
    <StudentLayout>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">My Courses</h1>
          <p className="text-sm text-muted-foreground">View your enrolled courses, grades, and attendance</p>
          <div className="mt-2"><SemesterBadge /></div>
        </div>
        {profile?.program && availableCourses.length > 0 && (
          <button
            onClick={() => setShowAddCourses(!showAddCourses)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
          >
            {showAddCourses ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showAddCourses ? "Close" : "Apply for Courses"}
          </button>
        )}
      </div>

      {/* Faculty & Program Context */}
      {programData && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{programData.faculty}</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
            <GraduationCap className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-foreground">{programData.title}</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Year {studentYear} · Semester {studentSemester}</span>
          </div>
        </div>
      )}

      {/* Enrollment Requests Summary */}
      {enrollmentRequests.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {pendingCount > 0 && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-600">{pendingCount} Pending</span>
            </div>
          )}
          {acceptedCount > 0 && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-600">{acceptedCount} Accepted</span>
            </div>
          )}
          {rejectedCount > 0 && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">{rejectedCount} Rejected</span>
            </div>
          )}
        </div>
      )}

      {/* Apply for Courses Panel */}
      {showAddCourses && (
        <div className="mt-6 rounded-xl border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent p-6">
          <h2 className="mb-1 font-display text-lg font-semibold text-foreground">Available Courses</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Request enrollment in courses from your program. Your academic advisor will review and approve.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {availableCourses.map((course) => {
              const request = getRequestStatus(course.id);
              return (
                <div key={course.id} className="rounded-xl border border-border bg-card p-4 transition-all hover:shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-secondary p-1.5">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-foreground text-sm truncate">{course.name}</h3>
                      <p className="text-xs text-muted-foreground">{course.code} · Y{course.year}/S{course.semester}</p>
                      {course.is_shared && (
                        <Badge className="mt-1 bg-amber-500/15 text-amber-600 border-amber-500/25 hover:bg-amber-500/15 text-[10px]">Common Course</Badge>
                      )}
                      {renderProfessorMeta(course.professor_id ?? null)}
                    </div>
                  </div>
                  <div className="mt-3">
                    {request ? (
                      statusBadge(request.status)
                    ) : (
                      <button
                        onClick={() => requestMutation.mutate(course.id)}
                        disabled={requestMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-60"
                      >
                        <Plus className="h-3 w-3" /> Apply for Course
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Enrolled Courses */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-display text-lg font-semibold text-foreground">Courses</h2>
          <Badge variant="secondary" className="text-xs">{enrollments.length}</Badge>
        </div>
        <div className="flex flex-col gap-3">
          {isLoading ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Loading your courses...
            </div>
          ) : enrollments.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">You are not enrolled in any courses yet.</p>
              {profile?.program && availableCourses.length > 0 && (
                <button onClick={() => setShowAddCourses(true)} className="mt-3 text-sm font-medium text-primary hover:underline">
                  Apply for courses →
                </button>
              )}
            </div>
          ) : (
            enrollments.map((enr, i) => renderEnrolledRow(enr, i))
          )}
        </div>
      </div>

      {/* All Program Courses - Grouped by Year/Semester */}
      {profile?.program && programCourses.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-display text-lg font-semibold text-foreground">Course Catalog</h2>
            <Badge variant="outline" className="text-xs">{programCourses.length} courses</Badge>
          </div>
          <p className="mb-5 text-sm text-muted-foreground">All courses in your program, grouped by year and semester</p>

          <div className="space-y-6">
            {Object.entries(yearSemGroups).map(([groupLabel, courses]) => (
              <div key={groupLabel}>
                <button
                  onClick={() => toggleFaculty(groupLabel)}
                  className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
                >
                  {collapsedFaculties[groupLabel] ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <GraduationCap className="h-4 w-4 text-primary" />
                  {groupLabel}
                  <span className="text-xs font-normal text-muted-foreground">({courses.length})</span>
                </button>

                {!collapsedFaculties[groupLabel] && (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {courses.map((course: any) => {
                      const isEnrolled = enrolledCourseIds.includes(course.id);
                      const request = getRequestStatus(course.id);
                      return (
                        <div
                          key={course.id}
                          className={`rounded-xl border p-4 transition-all ${
                            isEnrolled
                              ? "border-primary/30 bg-primary/5 shadow-sm"
                              : "border-border bg-card"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`rounded-md p-1.5 ${isEnrolled ? "bg-primary/15" : "bg-secondary"}`}>
                              {isEnrolled ? (
                                <BookOpen className="h-4 w-4 text-primary" />
                              ) : (
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-display font-semibold text-foreground text-sm truncate">{course.name}</h3>
                              <p className="text-xs text-muted-foreground">{course.code}</p>
                              {course.is_shared && (
                                <Badge className="mt-1 bg-amber-500/15 text-amber-600 border-amber-500/25 hover:bg-amber-500/15 text-[10px]">Common Course</Badge>
                              )}
                              {renderProfessorMeta(course.professor_id)}
                            </div>
                          </div>
                          <div className="mt-3">
                            {isEnrolled ? (
                              <Badge className="bg-primary/15 text-primary border-primary/25 hover:bg-primary/15">
                                <CheckCircle className="mr-1 h-3 w-3" /> Enrolled
                              </Badge>
                            ) : request ? (
                              statusBadge(request.status)
                            ) : (
                              <span className="text-xs text-muted-foreground">Not enrolled</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!profile?.program && !isLoading && (
        <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
          <GraduationCap className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">No program assigned yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">Contact administration to get assigned to a program.</p>
        </div>
      )}
    </StudentLayout>
  );
};

export default StudentCourses;
