import { useParams, Link } from "react-router-dom";
import StudentLayout from "@/components/StudentLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertTriangle, CheckCircle2, ExternalLink, ArrowLeft,
  CalendarDays, BarChart3, Loader2, BookOpen
} from "lucide-react";

const StudentCourseDetail = () => {
  const { id: courseId } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: course, isLoading: loadingCourse } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", courseId!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: enrollment } = useQuery({
    queryKey: ["enrollment", courseId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("*")
        .eq("course_id", courseId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId && !!user,
  });

  const { data: components = [] } = useQuery({
    queryKey: ["grade-components", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("grade_components").select("*").eq("course_id", courseId!).order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: grades = [] } = useQuery({
    queryKey: ["student-grades", enrollment?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("grades").select("*").eq("enrollment_id", enrollment!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!enrollment,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["attendance-sessions", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("attendance_sessions").select("*").eq("course_id", courseId!).order("session_date");
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ["student-attendance", enrollment?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("attendance_records").select("*").eq("enrollment_id", enrollment!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!enrollment,
  });

  /* ─── derived ─── */
  const presentCount = attendanceRecords.filter((r) => r.status === "present").length;
  const excusedCount = attendanceRecords.filter((r) => r.status === "excused").length;
  const absentCount = sessions.length - presentCount - excusedCount;
  const attPct = sessions.length > 0 ? Math.round((presentCount / sessions.length) * 100) : null;
  const examBlocked = attPct !== null && attPct < 75;

  let totalGrade = 0;
  components.forEach((comp) => {
    for (let i = 1; i <= comp.count; i++) {
      const grade = grades.find((g) => g.grade_component_id === comp.id && g.instance_number === i);
      if (grade && grade.score !== null) {
        totalGrade += (Number(grade.score) / Number(grade.max_score)) * Number(comp.weight);
      }
    }
  });
  const roundedTotal = Math.round(totalGrade);

  if (loadingCourse) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...
        </div>
      </StudentLayout>
    );
  }

  if (!course) {
    return (
      <StudentLayout>
        <p className="py-20 text-center text-muted-foreground">Course not found.</p>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      {/* Header */}
      <div className="mb-6">
        <Link to="/portal/courses" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to courses
        </Link>
        <div className="flex items-start gap-3">
          <BookOpen className="mt-1 h-6 w-6 text-primary flex-shrink-0" />
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">{course.name}</h1>
            <p className="text-sm text-muted-foreground">{course.code} · {course.program} · Year {course.year} · Sem {course.semester}</p>
          </div>
        </div>
        {course.syllabus_url && (
          <a href={course.syllabus_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
            <ExternalLink className="h-3.5 w-3.5" /> View Syllabus
          </a>
        )}
      </div>

      {/* Overview cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className={`rounded-xl border p-4 ${examBlocked ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"}`}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <CalendarDays className="h-4 w-4" /> Attendance
          </div>
          <p className={`text-2xl font-bold ${examBlocked ? "text-destructive" : attPct !== null ? "text-emerald-600" : "text-muted-foreground"}`}>
            {attPct !== null ? `${attPct}%` : "—"}
          </p>
          <p className="text-xs text-muted-foreground">{presentCount}/{sessions.length} sessions</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <BarChart3 className="h-4 w-4" /> Total Grade
          </div>
          <p className={`text-2xl font-bold ${roundedTotal >= 50 ? "text-emerald-600" : roundedTotal > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
            {roundedTotal > 0 ? `${roundedTotal}%` : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {roundedTotal >= 50 ? "Passing" : roundedTotal > 0 ? "Below passing" : "No grades yet"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <CheckCircle2 className="h-4 w-4" /> Status
          </div>
          <p className={`text-lg font-bold ${examBlocked ? "text-destructive" : "text-emerald-600"}`}>
            {examBlocked ? "Exam Blocked" : "Eligible"}
          </p>
          <p className="text-xs text-muted-foreground">
            {examBlocked ? "Attendance below 75%" : "All requirements met"}
          </p>
        </div>
      </div>

      {examBlocked && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">Exam Access Blocked</p>
            <p className="text-xs text-destructive/80">Your attendance is below the required 75% threshold. You will not be allowed to take the final exam.</p>
          </div>
        </div>
      )}

      {/* ─── ATTENDANCE ─── */}
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
          <CalendarDays className="h-5 w-5 text-primary" /> Attendance Record
        </h2>

        {sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground">
            No attendance data yet.
          </div>
        ) : (
          <>
            {/* Summary pills */}
            <div className="mb-4 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-700">
                Present: {presentCount}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-xs font-medium text-red-700">
                Absent: {absentCount}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-700">
                Excused: {excusedCount}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/80">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Week</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s, idx) => {
                    const rec = attendanceRecords.find((r) => r.session_id === s.id);
                    const status = rec?.status || "absent";
                    return (
                      <tr key={s.id} className={`border-b border-border last:border-0 ${idx % 2 === 0 ? "bg-card" : "bg-secondary/30"}`}>
                        <td className="px-4 py-2.5 text-muted-foreground">Week {s.week_number}</td>
                        <td className="px-4 py-2.5 text-foreground">
                          {new Date(s.session_date + "T00:00:00").toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold ${
                            status === "present" ? "bg-emerald-500/15 text-emerald-700" :
                            status === "excused" ? "bg-amber-500/15 text-amber-700" :
                            "bg-red-500/15 text-red-700"
                          }`}>
                            {status === "present" ? "✓ Present" : status === "excused" ? "⊘ Excused" : "✗ Absent"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ─── GRADES ─── */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
          <BarChart3 className="h-5 w-5 text-primary" /> Grade Breakdown
        </h2>

        {components.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground">
            No evaluation scheme defined yet.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/80">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Component</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Weight</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Weighted</th>
                  </tr>
                </thead>
                <tbody>
                  {components.flatMap((comp) =>
                    Array.from({ length: comp.count }, (_, i) => {
                      const grade = grades.find((g) => g.grade_component_id === comp.id && g.instance_number === i + 1);
                      const hasScore = grade && grade.score !== null;
                      const weighted = hasScore ? (Number(grade.score) / Number(grade.max_score)) * Number(comp.weight) : null;
                      return (
                        <tr key={`${comp.id}-${i}`} className={`border-b border-border last:border-0 ${(i) % 2 === 0 ? "bg-card" : "bg-secondary/30"}`}>
                          <td className="px-4 py-3 font-medium text-foreground">{comp.name}{comp.count > 1 ? ` ${i + 1}` : ""}</td>
                          <td className="px-4 py-3 text-center text-muted-foreground">{Number(comp.weight)}%</td>
                          <td className="px-4 py-3 text-center">
                            {hasScore ? (
                              <span className="font-semibold text-foreground">{grade.score}<span className="text-muted-foreground font-normal">/{grade.max_score}</span></span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {weighted !== null ? (
                              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                weighted >= Number(comp.weight) * 0.5
                                  ? "bg-emerald-500/15 text-emerald-700"
                                  : "bg-amber-500/15 text-amber-700"
                              }`}>
                                {weighted.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <span className="font-display font-semibold text-foreground">Final Grade</span>
              <span className={`text-2xl font-bold ${
                roundedTotal >= 50 ? "text-emerald-600" : roundedTotal > 0 ? "text-amber-600" : "text-muted-foreground"
              }`}>
                {roundedTotal}%
              </span>
            </div>
          </>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentCourseDetail;
