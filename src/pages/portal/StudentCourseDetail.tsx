import { useParams, Link } from "react-router-dom";
import StudentLayout from "@/components/StudentLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertTriangle, CheckCircle2, ExternalLink, ArrowLeft,
  CalendarDays, BarChart3, Loader2, BookOpen, TrendingUp,
  FileText, Download, X, Minus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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
  const presentCount = attendanceRecords.filter((r) => r.status === "present").length;
  const excusedCount = attendanceRecords.filter((r) => r.status === "excused").length;
  const absentCount = sessions.length - presentCount - excusedCount;
  const attPct = sessions.length > 0 ? Math.round((presentCount / sessions.length) * 100) : null;
  const examBlocked = attPct !== null && attPct < 75;

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
            <Progress value={attPct} className={`mt-2 h-2 ${attPct < 75 ? progressColor(0) : progressColor(attPct)}`} />
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">{presentCount}/{sessions.length} sessions</p>
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
            {examBlocked ? "Attendance below 75%" : "All requirements met"}
          </p>
        </div>
      </div>

      {/* Exam blocked warning */}
      {examBlocked && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">Exam Access Blocked</p>
            <p className="text-xs text-destructive/80">Your attendance is below the required 75% threshold.</p>
          </div>
        </div>
      )}

      {/* ─── GRADE BREAKDOWN ─── */}
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
          <BarChart3 className="h-5 w-5 text-primary" /> Grade Breakdown
        </h2>

        {components.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground">
            No evaluation scheme defined yet.
          </div>
        ) : (
          <>
            {/* Visual grade cards */}
            <div className="grid gap-3 sm:grid-cols-2">
              {componentScores.map((cs, idx) => (
                <div key={idx} className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">{cs.name}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{cs.weight}%</Badge>
                    </div>
                    {cs.hasScore ? (
                      <span className={`text-lg font-bold ${gradeColor(cs.pct!)}`}>
                        {cs.score}/{cs.maxScore}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not graded</span>
                    )}
                  </div>
                  {cs.hasScore ? (
                    <>
                      <Progress value={cs.pct!} className={`h-2 ${progressColor(cs.pct!)}`} />
                      <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{cs.pct!.toFixed(0)}% score</span>
                        <span className={`font-semibold ${gradeColor(cs.pct!)}`}>
                          +{cs.weighted!.toFixed(1)}% weighted
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="mt-1">
                      <Progress value={0} className="h-2" />
                      <p className="mt-1 text-xs text-muted-foreground">Awaiting grade</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Total summary bar */}
            <div className="mt-4 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span className="font-display text-base font-semibold text-foreground">Final Grade</span>
                </div>
                <span className={`text-3xl font-bold ${gradeColor(roundedTotal)}`}>
                  {roundedTotal}%
                </span>
              </div>
              <Progress value={roundedTotal} className={`h-3 ${progressColor(roundedTotal)}`} />
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{gradedComponentCount} of {componentScores.length} components graded</span>
                <span className="font-medium">
                  {roundedTotal >= 50 ? "✓ Passing" : roundedTotal > 0 ? "✗ Below passing" : "No grades yet"}
                </span>
              </div>
            </div>
          </>
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
        ) : (
          <>
            {/* Summary pills */}
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-700">
                ✓ Present: {presentCount}
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-700">
                ✗ Absent: {absentCount}
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-700">
                ⊘ Excused: {excusedCount}
              </div>
            </div>

            {/* Attendance progress bar */}
            {attPct !== null && (
              <div className="mb-4 rounded-lg border border-border bg-card p-3">
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="text-muted-foreground">Attendance rate</span>
                  <span className={`font-bold ${attPct < 75 ? "text-destructive" : "text-emerald-600"}`}>{attPct}%</span>
                </div>
                <Progress value={attPct} className={`h-2 ${attPct < 75 ? progressColor(0) : progressColor(attPct)}`} />
                {attPct < 75 && (
                  <p className="mt-1.5 text-xs text-destructive">⚠ Below 75% threshold</p>
                )}
              </div>
            )}

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
    </StudentLayout>
  );
};

export default StudentCourseDetail;
