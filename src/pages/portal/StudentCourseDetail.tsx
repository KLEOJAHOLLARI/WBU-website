import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import StudentLayout from "@/components/StudentLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertTriangle, CheckCircle2, ExternalLink, ArrowLeft,
  CalendarDays, BarChart3, Loader2, BookOpen, TrendingUp,
  FileText, Download, X, Minus, HelpCircle, Clock, ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { computeAttendanceForEnrollment } from "@/lib/attendance";
import { useAttendanceThreshold } from "@/hooks/useAttendanceThreshold";

const gradeColor = (pct: number) => {
  if (pct >= 70) return "text-emerald-600";
  if (pct >= 50) return "text-amber-600";
  if (pct > 0) return "text-destructive";
  return "text-muted-foreground";
};

const gradeBg = (pct: number) => {
  if (pct >= 70) return "bg-emerald-500/15 border-emerald-500/25";
  if (pct >= 50) return "bg-amber-500/15 border-amber-500/25";
  if (pct > 0) return "bg-destructive/15 border-destructive/25";
  return "bg-secondary border-border";
};

const progressColor = (pct: number) => {
  if (pct >= 70) return "[&>div]:bg-emerald-500";
  if (pct >= 50) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-destructive";
};

// Albanian academic grading scale (4 = fail, 10 = excellent)
const toAlbanian = (pct: number): number => {
  if (pct < 50) return 4;
  if (pct < 60) return 5;
  if (pct < 70) return 6;
  if (pct < 80) return 7;
  if (pct < 90) return 8;
  if (pct < 95) return 9;
  return 10;
};

type GradingScale = "percent" | "albanian";

const GRADING_SCALE_KEY = "wbu.gradingScale";

const StudentCourseDetail = () => {
  const { id: courseId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [gradingScale, setGradingScale] = useState<GradingScale>(() => {
    if (typeof window === "undefined") return "percent";
    return (localStorage.getItem(GRADING_SCALE_KEY) as GradingScale) || "percent";
  });

  useEffect(() => {
    localStorage.setItem(GRADING_SCALE_KEY, gradingScale);
  }, [gradingScale]);

  const formatGrade = (pct: number | null): string => {
    if (pct === null || pct <= 0) return "—";
    if (gradingScale === "albanian") return String(toAlbanian(pct));
    return `${Math.round(pct)}%`;
  };

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

  const { data: materials = [] } = useQuery({
    queryKey: ["course-materials", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_materials")
        .select("*")
        .eq("course_id", courseId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith("image/")) return "🖼️";
    if (contentType.includes("pdf")) return "📄";
    if (contentType.includes("word") || contentType.includes("document")) return "📝";
    if (contentType.includes("spreadsheet") || contentType.includes("excel")) return "📊";
    if (contentType.includes("presentation") || contentType.includes("powerpoint")) return "📽️";
    return "📎";
  };

  const downloadMaterial = (filePath: string, fileName: string) => {
    const { data } = supabase.storage.from("course-materials").getPublicUrl(filePath);
    const a = document.createElement("a");
    a.href = data.publicUrl;
    a.download = fileName;
    a.target = "_blank";
    a.click();
  };

  /* ─── derived ─── */
  const threshold = useAttendanceThreshold();
  const attStats = enrollment
    ? computeAttendanceForEnrollment(enrollment.id, sessions as any, attendanceRecords as any, threshold)
    : { attendedHours: 0, totalHours: 0, percentage: null as number | null, isEligible: true };
  const presentCount = attendanceRecords.filter((r) => r.status === "present").length;
  const excusedCount = attendanceRecords.filter((r) => r.status === "excused").length;
  const recordedSessionCount = attendanceRecords.length;
  const absentCount = recordedSessionCount - presentCount - excusedCount;
  const attPct = attStats.percentage;
  const examBlocked = attPct !== null && attPct < threshold;

  // Calculate per-component scores
  const componentScores = components.flatMap((comp) =>
    Array.from({ length: comp.count }, (_, i) => {
      const grade = grades.find((g) => g.grade_component_id === comp.id && g.instance_number === i + 1);
      const hasScore = grade && grade.score !== null;
      const pct = hasScore ? (Number(grade.score) / Number(grade.max_score)) * 100 : null;
      const weighted = hasScore ? (Number(grade.score) / Number(grade.max_score)) * Number(comp.weight) : null;
      return {
        name: comp.count > 1 ? `${comp.name} ${i + 1}` : comp.name,
        weight: Number(comp.weight),
        score: grade?.score ?? null,
        maxScore: grade?.max_score ?? 100,
        pct,
        weighted,
        hasScore,
      };
    })
  );

  let totalGrade = 0;
  componentScores.forEach((cs) => {
    if (cs.weighted !== null) totalGrade += cs.weighted;
  });
  const roundedTotal = Math.round(totalGrade);
  const gradedComponentCount = componentScores.filter(cs => cs.hasScore).length;

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
          <div className="rounded-lg bg-primary/10 p-2 flex-shrink-0">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
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
      <div className="mb-8 grid gap-4 grid-cols-2 sm:grid-cols-3">
        {/* Attendance card */}
        <div className={`rounded-xl border p-4 ${examBlocked ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"}`}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <CalendarDays className="h-4 w-4" /> Attendance
          </div>
          <p className={`text-3xl font-bold ${examBlocked ? "text-destructive" : attPct !== null ? "text-emerald-600" : "text-muted-foreground"}`}>
            {attPct !== null ? `${attPct}%` : "—"}
          </p>
          {attPct !== null && (
            <Progress value={attPct} className={`mt-2 h-2 ${attPct < threshold ? progressColor(0) : progressColor(attPct)}`} />
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">{attStats.attendedHours}h of {attStats.totalHours}h attended</p>
        </div>

        {/* Total Grade card */}
        <div className={`rounded-xl border p-4 ${gradeBg(roundedTotal)}`}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <BarChart3 className="h-4 w-4" /> Total Grade
          </div>
          <p className={`text-3xl font-bold ${gradeColor(roundedTotal)}`}>
            {roundedTotal > 0 ? `${roundedTotal}%` : "—"}
          </p>
          {roundedTotal > 0 && (
            <Progress value={roundedTotal} className={`mt-2 h-2 ${progressColor(roundedTotal)}`} />
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            {gradedComponentCount}/{componentScores.length} graded
          </p>
        </div>

        {/* Status card */}
        <div className={`rounded-xl border p-4 col-span-2 sm:col-span-1 ${examBlocked ? "border-destructive/30 bg-destructive/5" : "border-emerald-500/20 bg-emerald-500/5"}`}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <CheckCircle2 className="h-4 w-4" /> Status
          </div>
          <p className={`text-xl font-bold ${examBlocked ? "text-destructive" : "text-emerald-600"}`}>
            {examBlocked ? "Exam Blocked" : "Eligible"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {examBlocked ? `Attendance below ${threshold}%` : "All requirements met"}
          </p>
        </div>
      </div>

      {/* Exam blocked warning */}
      {examBlocked && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">Exam Access Blocked</p>
            <p className="text-xs text-destructive/80">Your attendance is below the required {threshold}% threshold.</p>
          </div>
        </div>
      )}

      {/* ─── GRADES TABLE ─── */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <BarChart3 className="h-5 w-5 text-primary" />
            Grades for {course.name} ({course.code})
          </h2>
        </div>

        {components.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground">
            No evaluation scheme defined yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {/* Desktop / tablet table */}
            <table className="hidden w-full sm:table">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Evaluation Type
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Weight
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Result
                  </th>
                </tr>
              </thead>
              <tbody>
                {componentScores.map((cs, idx) => (
                  <tr key={idx} className="border-t border-border transition-colors hover:bg-muted/30">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-foreground">{cs.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cs.hasScore
                          ? `Contributes ${cs.weighted!.toFixed(1)}% to final grade`
                          : "Awaiting grade"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="outline" className="text-xs">{cs.weight}%</Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {cs.hasScore ? (
                        <div className="flex flex-col items-end">
                          <span className={`font-display text-lg font-bold ${gradeColor(cs.pct!)}`}>
                            {cs.score}/{cs.maxScore}
                          </span>
                          <span className="text-xs text-muted-foreground">{cs.pct!.toFixed(0)}%</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={`border-t-2 border-border ${gradeBg(roundedTotal)}`}>
                  <td className="px-5 py-4">
                    <p className="font-display text-base font-bold text-foreground">
                      Overall Semester Grade
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {gradedComponentCount} of {componentScores.length} components graded
                      {roundedTotal > 0 && (roundedTotal >= 50 ? " · ✓ Passing" : " · ✗ Below passing")}
                    </p>
                  </td>
                  <td className="px-5 py-4" />
                  <td className="px-5 py-4 text-right">
                    <span className={`font-display text-3xl font-bold ${gradeColor(roundedTotal)}`}>
                      {roundedTotal > 0 ? `${roundedTotal}%` : "—"}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Mobile stacked list */}
            <div className="divide-y divide-border sm:hidden">
              {componentScores.map((cs, idx) => (
                <div key={idx} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{cs.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{cs.weight}%</Badge>
                      <span className="text-xs text-muted-foreground">
                        {cs.hasScore ? `+${cs.weighted!.toFixed(1)}% weighted` : "Awaiting grade"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    {cs.hasScore ? (
                      <>
                        <span className={`font-display text-base font-bold ${gradeColor(cs.pct!)}`}>
                          {cs.score}/{cs.maxScore}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{cs.pct!.toFixed(0)}%</span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              ))}
              <div className={`flex items-center justify-between gap-3 px-4 py-4 ${gradeBg(roundedTotal)}`}>
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold text-foreground">
                    Overall Semester Grade
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {gradedComponentCount}/{componentScores.length} graded
                    {roundedTotal > 0 && (roundedTotal >= 50 ? " · Passing" : " · Below passing")}
                  </p>
                </div>
                <span className={`font-display text-2xl font-bold ${gradeColor(roundedTotal)}`}>
                  {roundedTotal > 0 ? `${roundedTotal}%` : "—"}
                </span>
              </div>
            </div>

            {/* Final progress bar */}
            {componentScores.length > 0 && (
              <div className="border-t border-border bg-card px-5 py-4">
                <Progress value={roundedTotal} className={`h-2 ${progressColor(roundedTotal)}`} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── ATTENDANCE ─── */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
          <CalendarDays className="h-5 w-5 text-primary" /> Attendance Record
        </h2>

        {sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground">
            No attendance data yet.
          </div>
        ) : (() => {
          // Group sessions by week_number, each session within a week = one "hour"
          const weekMap = new Map<number, typeof sessions>();
          sessions.forEach((s) => {
            const arr = weekMap.get(s.week_number) || [];
            arr.push(s);
            weekMap.set(s.week_number, arr);
          });
          const weekNumbers = [...weekMap.keys()].sort((a, b) => a - b);
          const maxHours = Math.max(...[...weekMap.values()].map((arr) => arr.length));

          return (
            <>
              {/* Attendance percentage highlight */}
              {attPct !== null && (
                <div className="mb-4 rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Overall Attendance</span>
                    <span className={`text-2xl font-bold ${attPct < threshold ? "text-destructive" : "text-emerald-600"}`}>{attPct}%</span>
                  </div>
                  <Progress value={attPct} className={`h-3 ${attPct < threshold ? progressColor(0) : progressColor(attPct)}`} />
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{attStats.attendedHours}h attended of {attStats.totalHours}h recorded</span>
                    {attPct < threshold && <span className="text-destructive font-medium">⚠ Below {threshold}% threshold</span>}
                  </div>
                </div>
              )}

              {/* Legend */}
              <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card px-4 py-2.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Legend:</span>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/15 border border-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  </span>
                  <span className="text-xs text-muted-foreground">Present</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-red-500/15 border border-red-300">
                    <X className="h-3.5 w-3.5 text-red-600" />
                  </span>
                  <span className="text-xs text-muted-foreground">Absent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-secondary border border-border">
                    <Minus className="h-3.5 w-3.5 text-muted-foreground/50" />
                  </span>
                  <span className="text-xs text-muted-foreground">Not recorded</span>
                </div>
              </div>

              {/* Weeks × Hours grid table */}
              <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/80">
                      <th className="sticky left-0 z-10 bg-secondary/80 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[100px]">
                        Week
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[120px]">
                        Date
                      </th>
                      {Array.from({ length: maxHours }, (_, i) => (
                        <th key={i} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[80px]">
                          Hour {i + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {weekNumbers.map((weekNum, wIdx) => {
                      const weekSessions = weekMap.get(weekNum) || [];
                      // Sort sessions within a week by date
                      weekSessions.sort((a, b) => a.session_date.localeCompare(b.session_date));
                      const firstDate = weekSessions[0]?.session_date;

                      return (
                        <tr key={weekNum} className={`border-b border-border last:border-0 ${wIdx % 2 === 0 ? "bg-card" : "bg-secondary/30"}`}>
                          <td className={`sticky left-0 z-10 px-4 py-3 font-semibold text-foreground ${wIdx % 2 === 0 ? "bg-card" : "bg-secondary/30"}`}>
                            Week {weekNum}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {firstDate
                              ? new Date(firstDate + "T00:00:00").toLocaleDateString("en", { month: "short", day: "numeric" })
                              : "—"}
                          </td>
                          {Array.from({ length: maxHours }, (_, hIdx) => {
                            const session = weekSessions[hIdx];
                            if (!session) {
                              return (
                                <td key={hIdx} className="px-3 py-3 text-center">
                                  <span className="inline-flex h-9 w-10 items-center justify-center rounded-lg border-2 border-border bg-secondary/50 text-muted-foreground/40" title="No session">
                                    <Minus className="h-4 w-4" />
                                  </span>
                                </td>
                              );
                            }
                            const rec = attendanceRecords.find((r) => r.session_id === session.id);
                            if (!rec) {
                              return (
                                <td key={hIdx} className="px-3 py-3 text-center">
                                  <span
                                    className="inline-flex h-9 w-10 items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/30 text-muted-foreground/40"
                                    title="No attendance recorded by lecturer"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </span>
                                </td>
                              );
                            }
                            const isPresent = rec.status === "present";
                            return (
                              <td key={hIdx} className="px-3 py-3 text-center">
                                <span
                                  className={`inline-flex h-9 w-10 items-center justify-center rounded-lg border-2 transition-all duration-200 ${
                                    isPresent
                                      ? "border-emerald-400 bg-emerald-500/20 text-emerald-600 shadow-sm shadow-emerald-500/10"
                                      : "border-red-300 bg-red-500/15 text-red-500"
                                  }`}
                                  title={isPresent ? "Present" : "Absent"}
                                >
                                  {isPresent ? <CheckCircle2 className="h-4.5 w-4.5" /> : <X className="h-4.5 w-4.5" />}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary stats */}
              <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-4">
                <div className="rounded-xl border border-border bg-card p-3 text-center">
                  <p className="text-xl font-bold text-emerald-600">{attStats.attendedHours}h</p>
                  <p className="text-xs text-muted-foreground">Attended</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3 text-center">
                  <p className="text-xl font-bold text-destructive">{Math.max(0, attStats.totalHours - attStats.attendedHours)}h</p>
                  <p className="text-xs text-muted-foreground">Missed</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{attStats.totalHours}h</p>
                  <p className="text-xs text-muted-foreground">Recorded</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{sessions.length}</p>
                  <p className="text-xs text-muted-foreground">Sessions</p>
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* ─── MATERIALS ─── */}
      <div className="mt-8">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
          <FileText className="h-5 w-5 text-primary" /> Course Materials
        </h2>

        {materials.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground">
            No materials uploaded yet.
          </div>
        ) : (
          <div className="space-y-2">
            {materials.map((m) => (
              <div
                key={m.id}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/30"
              >
                <span className="text-xl flex-shrink-0">{getFileIcon(m.content_type)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{m.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(Number(m.file_size))} · {new Date(m.created_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <button
                  onClick={() => downloadMaterial(m.file_path, m.file_name)}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* ═══ Quizzes ═══ */}
      <QuizzesSection courseId={courseId!} />
    </StudentLayout>
  );
};

/* ─── Quizzes section component ─── */
const QuizzesSection = ({ courseId }: { courseId: string }) => {
  const { user } = useAuth();

  const { data: quizzes = [] } = useQuery({
    queryKey: ["student-course-quizzes", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .eq("course_id", courseId)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ["student-quiz-attempts-list", courseId, user?.id],
    queryFn: async () => {
      if (!quizzes.length || !user) return [];
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("user_id", user.id)
        .in("quiz_id", quizzes.map(q => q.id));
      if (error) throw error;
      return data || [];
    },
    enabled: quizzes.length > 0 && !!user,
  });

  if (quizzes.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
        <HelpCircle className="h-5 w-5 text-primary" /> Quizzes
      </h2>
      <div className="space-y-3">
        {quizzes.map((quiz) => {
          const attempt = attempts.find(a => a.quiz_id === quiz.id);
          const isCompleted = !!attempt?.submitted_at;
          const pct = isCompleted && attempt.max_score
            ? Math.round((Number(attempt.score) / Number(attempt.max_score)) * 100)
            : null;

          return (
            <Link
              key={quiz.id}
              to={`/portal/quiz/${quiz.id}`}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <h3 className="font-display font-semibold text-foreground">{quiz.title}</h3>
                <div className="mt-1 flex flex-wrap gap-2">
                  {quiz.time_limit_minutes && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {quiz.time_limit_minutes} min
                    </span>
                  )}
                  {isCompleted ? (
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${pct! >= 50 ? "text-emerald-600" : "text-destructive"}`}>
                      <CheckCircle2 className="h-3 w-3" /> {pct}% — {attempt.score}/{attempt.max_score} points
                    </span>
                  ) : attempt ? (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                      <Clock className="h-3 w-3" /> In progress
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not started</span>
                  )}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default StudentCourseDetail;
