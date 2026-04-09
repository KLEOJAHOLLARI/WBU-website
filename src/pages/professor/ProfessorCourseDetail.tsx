import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import ProfessorLayout from "@/components/ProfessorLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Save, ArrowLeft, Users, CalendarDays,
  BarChart3, ClipboardCheck, AlertTriangle, CheckCircle2, Loader2,
  Search, TrendingUp, Award
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

/* ─── helpers ─── */
const inputBase =
  "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors";

const statusStyles: Record<string, string> = {
  present: "bg-emerald-500/15 text-emerald-700 border-emerald-300",
  absent: "bg-red-500/15 text-red-700 border-red-300",
  excused: "bg-amber-500/15 text-amber-700 border-amber-300",
};

const gradeColor = (pct: number) => {
  if (pct >= 90) return "text-emerald-600";
  if (pct >= 70) return "text-emerald-600";
  if (pct >= 50) return "text-amber-600";
  return "text-destructive";
};

const gradeBg = (pct: number) => {
  if (pct >= 70) return "bg-emerald-500/15 text-emerald-700";
  if (pct >= 50) return "bg-amber-500/15 text-amber-700";
  if (pct > 0) return "bg-destructive/15 text-destructive";
  return "bg-secondary text-muted-foreground";
};

/* ─── Inline editable cell ─── */
const GradeCell = ({ defaultValue, onSave, isSaving }: { defaultValue: string; onSave: (val: string) => void; isSaving?: boolean }) => {
  const [value, setValue] = useState(defaultValue);
  const [dirty, setDirty] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setValue(defaultValue); setDirty(false); }, [defaultValue]);

  const handleBlur = () => {
    if (dirty && value !== defaultValue) {
      onSave(value);
      setDirty(false);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="number"
        value={value}
        onChange={(e) => { setValue(e.target.value); setDirty(true); }}
        onBlur={handleBlur}
        onKeyDown={(e) => { if (e.key === "Enter") inputRef.current?.blur(); }}
        className={`w-16 rounded-md border px-2 py-1.5 text-center text-sm transition-all focus:border-primary focus:ring-1 focus:ring-primary ${
          dirty ? "border-primary/50 bg-primary/5" : "border-input bg-background"
        } text-foreground`}
        placeholder="—"
        min={0}
        max={100}
      />
      {isSaving && (
        <Loader2 className="absolute -right-1 -top-1 h-3 w-3 animate-spin text-primary" />
      )}
    </div>
  );
};

const ProfessorCourseDetail = () => {
  const { id: courseId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"scheme" | "attendance" | "grades">("scheme");
  const [studentSearch, setStudentSearch] = useState("");

  /* ─── queries ─── */
  const { data: course, isLoading: loadingCourse } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", courseId!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: components = [], isLoading: loadingComps } = useQuery({
    queryKey: ["grade-components", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("grade_components").select("*").eq("course_id", courseId!).order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: enrollments = [], isLoading: loadingEnr } = useQuery({
    queryKey: ["course-enrollments", courseId],
    queryFn: async () => {
      // 1. Fetch enrollments for this course
      const { data: enrData, error: enrError } = await supabase
        .from("enrollments")
        .select("*")
        .eq("course_id", courseId!);
      if (enrError) throw enrError;
      if (!enrData?.length) return [];

      // 2. Fetch profiles for enrolled students
      const userIds = [...new Set(enrData.map((e) => e.user_id))];
      const { data: profilesData, error: profError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);
      if (profError) throw profError;

      // 3. Merge profiles into enrollments
      const profileMap = new Map((profilesData || []).map((p) => [p.user_id, p]));
      return enrData.map((e) => ({
        ...e,
        profiles: profileMap.get(e.user_id) || { full_name: "Unknown", email: "" },
      }));
    },
    enabled: !!courseId,
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
    queryKey: ["attendance-records", courseId],
    queryFn: async () => {
      const enrollmentIds = enrollments.map((e) => e.id);
      if (enrollmentIds.length === 0) return [];
      const { data, error } = await supabase.from("attendance_records").select("*").in("enrollment_id", enrollmentIds);
      if (error) throw error;
      return data;
    },
    enabled: enrollments.length > 0,
  });

  const { data: grades = [] } = useQuery({
    queryKey: ["grades", courseId],
    queryFn: async () => {
      const enrollmentIds = enrollments.map((e) => e.id);
      if (enrollmentIds.length === 0) return [];
      const { data, error } = await supabase.from("grades").select("*").in("enrollment_id", enrollmentIds);
      if (error) throw error;
      return data;
    },
    enabled: enrollments.length > 0,
  });

  /* ─── mutations ─── */
  const [newComp, setNewComp] = useState({ name: "", weight: 0, count: 1 });
  const addComponent = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("grade_components").insert({ course_id: courseId!, ...newComp });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grade-components", courseId] });
      setNewComp({ name: "", weight: 0, count: 1 });
      toast({ title: "Component added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteComponent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("grade_components").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grade-components", courseId] });
      toast({ title: "Component removed" });
    },
  });

  const [sessionDate, setSessionDate] = useState("");
  const [sessionWeek, setSessionWeek] = useState(sessions.length + 1);
  const addSession = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("attendance_sessions").insert({
        course_id: courseId!, session_date: sessionDate, week_number: sessionWeek,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance-sessions", courseId] });
      setSessionDate("");
      setSessionWeek((prev) => prev + 1);
      toast({ title: "Session added" });
    },
  });

  const deleteSession = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("attendance_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance-sessions", courseId] });
      toast({ title: "Session removed" });
    },
  });

  const toggleAttendance = useMutation({
    mutationFn: async ({ sessionId, enrollmentId, status }: { sessionId: string; enrollmentId: string; status: string }) => {
      const existing = attendanceRecords.find((r) => r.session_id === sessionId && r.enrollment_id === enrollmentId);
      if (existing) {
        await supabase.from("attendance_records").update({ status }).eq("id", existing.id);
      } else {
        await supabase.from("attendance_records").insert({ session_id: sessionId, enrollment_id: enrollmentId, status });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance-records", courseId] }),
  });

  const [savingCell, setSavingCell] = useState<string | null>(null);
  const saveGrade = useMutation({
    mutationFn: async ({ enrollmentId, componentId, instance, score, maxScore }: any) => {
      setSavingCell(`${enrollmentId}-${componentId}-${instance}`);
      const existing = grades.find(
        (g) => g.enrollment_id === enrollmentId && g.grade_component_id === componentId && g.instance_number === instance
      );
      if (existing) {
        await supabase.from("grades").update({ score, max_score: maxScore }).eq("id", existing.id);
      } else {
        await supabase.from("grades").insert({
          enrollment_id: enrollmentId, grade_component_id: componentId,
          instance_number: instance, score, max_score: maxScore,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grades", courseId] });
      setSavingCell(null);
    },
    onError: (e: any) => {
      toast({ title: "Error saving grade", description: e.message, variant: "destructive" });
      setSavingCell(null);
    },
  });

  /* ─── derived ─── */
  const totalWeight = components.reduce((s, c) => s + Number(c.weight) * c.count, 0);

  const getStudentName = (enr: any) => enr.profiles?.full_name || enr.profiles?.email || "Unknown";

  const getAttPct = useCallback(
    (enrollmentId: string) => {
      if (sessions.length === 0) return null;
      const present = attendanceRecords.filter((r) => r.enrollment_id === enrollmentId && r.status === "present").length;
      return Math.round((present / sessions.length) * 100);
    },
    [attendanceRecords, sessions]
  );

  const getStudentTotal = useCallback(
    (enrollmentId: string) => {
      let total = 0;
      const sg = grades.filter((g) => g.enrollment_id === enrollmentId);
      components.forEach((c) => {
        for (let i = 1; i <= c.count; i++) {
          const g = sg.find((gr) => gr.grade_component_id === c.id && gr.instance_number === i);
          if (g && g.score !== null) total += (Number(g.score) / Number(g.max_score)) * Number(c.weight);
        }
      });
      return Math.round(total);
    },
    [grades, components]
  );

  // Filter enrollments by student search
  const filteredEnrollments = studentSearch
    ? enrollments.filter(e => getStudentName(e).toLowerCase().includes(studentSearch.toLowerCase()))
    : enrollments;

  // Class stats
  const classAvg = enrollments.length > 0
    ? Math.round(enrollments.reduce((s, e) => s + getStudentTotal(e.id), 0) / enrollments.length)
    : 0;
  const passingCount = enrollments.filter((e) => getStudentTotal(e.id) >= 50).length;
  const failingCount = enrollments.filter((e) => { const t = getStudentTotal(e.id); return t > 0 && t < 50; }).length;
  const lowAttCount = enrollments.filter((e) => { const p = getAttPct(e.id); return p !== null && p < 75; }).length;

  /* ─── tab styling ─── */
  const tabItems = [
    { key: "scheme", label: "Evaluation", icon: BarChart3 },
    { key: "attendance", label: "Attendance", icon: CalendarDays },
    { key: "grades", label: "Grades", icon: ClipboardCheck },
  ] as const;

  if (loadingCourse) {
    return (
      <ProfessorLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading course...
        </div>
      </ProfessorLayout>
    );
  }

  if (!course) {
    return (
      <ProfessorLayout>
        <p className="py-20 text-center text-muted-foreground">Course not found.</p>
      </ProfessorLayout>
    );
  }

  return (
    <ProfessorLayout>
      {/* Header */}
      <div className="mb-6">
        <Link to="/professor/courses" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to courses
        </Link>
        <h1 className="font-display text-2xl font-bold text-foreground">{course.name}</h1>
        <p className="text-sm text-muted-foreground">{course.code} · {course.program} · Year {course.year} · Sem {course.semester}</p>

        {/* Quick stats */}
        <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-card px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" /> Students</div>
            <p className="mt-0.5 text-lg font-bold text-foreground">{enrollments.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><TrendingUp className="h-3.5 w-3.5" /> Class Avg</div>
            <p className={`mt-0.5 text-lg font-bold ${gradeColor(classAvg)}`}>{classAvg > 0 ? `${classAvg}%` : "—"}</p>
          </div>
          <div className="rounded-lg border border-border bg-card px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Award className="h-3.5 w-3.5" /> Passing</div>
            <p className="mt-0.5 text-lg font-bold text-emerald-600">{passingCount}</p>
          </div>
          <div className="rounded-lg border border-border bg-card px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5" /> Low Att.</div>
            <p className={`mt-0.5 text-lg font-bold ${lowAttCount > 0 ? "text-destructive" : "text-muted-foreground"}`}>{lowAttCount}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {tabItems.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {/* ═══════ EVALUATION SCHEME ═══════ */}
        {tab === "scheme" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">Grade Components</h2>
                <p className="text-sm text-muted-foreground">
                  Total weight:{" "}
                  <span className={`font-semibold ${totalWeight === 100 ? "text-emerald-600" : "text-destructive"}`}>
                    {totalWeight}%
                  </span>
                  {totalWeight !== 100 && <span className="ml-1">(must equal 100%)</span>}
                </p>
              </div>
              {totalWeight === 100 && (
                <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/25 hover:bg-emerald-500/15">
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Complete
                </Badge>
              )}
            </div>

            {/* Weight progress bar */}
            <div>
              <Progress value={Math.min(totalWeight, 100)} className="h-2" />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>

            {loadingComps ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
            ) : components.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground">
                No components defined yet. Add your first grading component below.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {components.map((c) => {
                  const compPct = (c.count * Number(c.weight));
                  return (
                    <div key={c.id} className="group relative rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground">{c.name}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {c.count > 1 ? `${c.count} instances × ` : ""}{Number(c.weight)}% each
                          </p>
                        </div>
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                          {compPct}%
                        </span>
                      </div>
                      <Progress value={(compPct / (totalWeight || 100)) * 100} className="mt-3 h-1.5" />
                      <button
                        onClick={() => deleteComponent.mutate(c.id)}
                        className="absolute right-2 top-2 rounded p-1 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 transition-opacity"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add new component */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Add Component</h3>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[160px]">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
                  <input value={newComp.name} onChange={(e) => setNewComp({ ...newComp, name: e.target.value })} className={inputBase} placeholder="e.g. Midterm, Quiz, Final" />
                </div>
                <div className="w-24">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Weight %</label>
                  <input type="number" value={newComp.weight || ""} onChange={(e) => setNewComp({ ...newComp, weight: Number(e.target.value) })} className={inputBase} placeholder="30" min={0} max={100} />
                </div>
                <div className="w-20">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Count</label>
                  <input type="number" value={newComp.count} onChange={(e) => setNewComp({ ...newComp, count: Number(e.target.value) })} className={inputBase} min={1} />
                </div>
                <button
                  onClick={() => addComponent.mutate()}
                  disabled={!newComp.name || newComp.weight <= 0 || addComponent.isPending}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {addComponent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ ATTENDANCE ═══════ */}
        {tab === "attendance" && (
          <div className="space-y-6">
            {/* Add session form */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">New Attendance Session</h3>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="min-w-[160px]">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Date</label>
                  <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className={inputBase} />
                </div>
                <div className="w-24">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Week #</label>
                  <input type="number" value={sessionWeek} onChange={(e) => setSessionWeek(Number(e.target.value))} className={inputBase} min={1} />
                </div>
                <button
                  onClick={() => addSession.mutate()}
                  disabled={!sessionDate || addSession.isPending}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {addSession.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add Session
                </button>
              </div>
            </div>

            {enrollments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground">
                No students enrolled yet.
              </div>
            ) : sessions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground">
                No attendance sessions created yet. Add your first session above.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/80">
                        <th className="sticky left-0 z-20 bg-secondary/80 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Student
                        </th>
                        {sessions.map((s) => (
                          <th key={s.id} className="px-2 py-3 text-center min-w-[60px]">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-xs font-semibold text-foreground">W{s.week_number}</span>
                              <span className="text-[10px] text-muted-foreground">{new Date(s.session_date + "T00:00:00").toLocaleDateString("en", { month: "short", day: "numeric" })}</span>
                              <button
                                onClick={() => { if (confirm("Delete this session?")) deleteSession.mutate(s.id); }}
                                className="mt-0.5 rounded p-0.5 text-muted-foreground/50 hover:text-destructive transition-colors"
                                title="Delete session"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </th>
                        ))}
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrollments.map((enr, idx) => {
                        const pct = getAttPct(enr.id);
                        const isLow = pct !== null && pct < 75;
                        return (
                          <tr key={enr.id} className={`border-b border-border last:border-0 ${isLow ? "bg-red-500/5" : idx % 2 === 0 ? "bg-card" : "bg-secondary/30"}`}>
                            <td className={`sticky left-0 z-10 px-4 py-2.5 font-medium text-foreground ${isLow ? "bg-red-500/5" : idx % 2 === 0 ? "bg-card" : "bg-secondary/30"}`}>
                              <div className="flex items-center gap-2">
                                {isLow && <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />}
                                <span className="truncate max-w-[160px]">{getStudentName(enr)}</span>
                              </div>
                            </td>
                            {sessions.map((s) => {
                              const rec = attendanceRecords.find((r) => r.session_id === s.id && r.enrollment_id === enr.id);
                              const st = rec?.status || "absent";
                              return (
                                <td key={s.id} className="px-1 py-2 text-center">
                                  <button
                                    onClick={() => {
                                      const next = st === "present" ? "absent" : st === "absent" ? "excused" : "present";
                                      toggleAttendance.mutate({ sessionId: s.id, enrollmentId: enr.id, status: next });
                                    }}
                                    className={`inline-flex h-7 w-9 items-center justify-center rounded-md border text-xs font-bold transition-colors ${statusStyles[st]}`}
                                    title={`Click to toggle (${st})`}
                                  >
                                    {st === "present" ? "P" : st === "excused" ? "E" : "A"}
                                  </button>
                                </td>
                              );
                            })}
                            <td className="px-4 py-2.5 text-center">
                              <span className={`inline-block min-w-[48px] rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                isLow ? "bg-destructive/15 text-destructive" : "bg-emerald-500/15 text-emerald-700"
                              }`}>
                                {pct !== null ? `${pct}%` : "—"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Summary stats */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-card p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{sessions.length}</p>
                    <p className="text-xs text-muted-foreground">Sessions</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600">
                      {enrollments.filter((e) => { const p = getAttPct(e.id); return p !== null && p >= 75; }).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Above 75%</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 text-center">
                    <p className="text-2xl font-bold text-destructive">
                      {enrollments.filter((e) => { const p = getAttPct(e.id); return p !== null && p < 75; }).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Below 75%</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══════ GRADES ═══════ */}
        {tab === "grades" && (
          <div className="space-y-6">
            {components.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground">
                <BarChart3 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                <p>Define evaluation scheme first.</p>
                <button onClick={() => setTab("scheme")} className="mt-2 text-sm text-primary hover:underline">Go to Evaluation Scheme →</button>
              </div>
            ) : enrollments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground">
                No students enrolled yet.
              </div>
            ) : (
              <>
                {/* Header with search */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-foreground">Student Grades</h2>
                    <p className="text-sm text-muted-foreground">Edit grades inline — changes save on blur automatically.</p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Filter students..."
                      className={`${inputBase} w-full pl-9`}
                    />
                  </div>
                </div>

                {/* Grade grid */}
                <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/80">
                        <th className="sticky left-0 z-20 bg-secondary/80 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[180px]">
                          Student
                        </th>
                        {components.flatMap((c) =>
                          Array.from({ length: c.count }, (_, i) => (
                            <th key={`${c.id}-${i}`} className="px-2 py-3 text-center min-w-[80px]">
                              <div className="flex flex-col items-center">
                                <span className="text-xs font-semibold text-foreground truncate max-w-[80px]">
                                  {c.name}{c.count > 1 ? ` ${i + 1}` : ""}
                                </span>
                                <span className="text-[10px] text-muted-foreground">{Number(c.weight)}%</span>
                              </div>
                            </th>
                          ))
                        )}
                        <th className="px-3 py-3 text-center min-w-[60px]">
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-semibold text-foreground">Att.</span>
                            <span className="text-[10px] text-muted-foreground">%</span>
                          </div>
                        </th>
                        <th className="px-3 py-3 text-center min-w-[70px]">
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-semibold text-foreground">Total</span>
                            <span className="text-[10px] text-muted-foreground">/100</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEnrollments.map((enr, idx) => {
                        const studentTotal = getStudentTotal(enr.id);
                        const attPctVal = getAttPct(enr.id);
                        const isLowAtt = attPctVal !== null && attPctVal < 75;
                        return (
                          <tr key={enr.id} className={`border-b border-border last:border-0 ${idx % 2 === 0 ? "bg-card" : "bg-secondary/30"}`}>
                            <td className={`sticky left-0 z-10 px-4 py-2 font-medium text-foreground ${idx % 2 === 0 ? "bg-card" : "bg-secondary/30"}`}>
                              <div className="flex items-center gap-2">
                                <span className="truncate max-w-[150px]">{getStudentName(enr)}</span>
                                {isLowAtt && (
                                  <span className="flex-shrink-0 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-medium text-destructive" title="Below 75% attendance">
                                    ⚠
                                  </span>
                                )}
                              </div>
                            </td>
                            {components.flatMap((c) =>
                              Array.from({ length: c.count }, (_, i) => {
                                const grade = grades.find(
                                  (g) => g.enrollment_id === enr.id && g.grade_component_id === c.id && g.instance_number === i + 1
                                );
                                const cellKey = `${enr.id}-${c.id}-${i + 1}`;
                                return (
                                  <td key={cellKey} className="px-1 py-1.5 text-center">
                                    <GradeCell
                                      defaultValue={grade?.score?.toString() ?? ""}
                                      isSaving={savingCell === cellKey}
                                      onSave={(val) => {
                                        if (val !== "") {
                                          saveGrade.mutate({
                                            enrollmentId: enr.id,
                                            componentId: c.id,
                                            instance: i + 1,
                                            score: Number(val),
                                            maxScore: 100,
                                          });
                                        }
                                      }}
                                    />
                                  </td>
                                );
                              })
                            )}
                            <td className="px-2 py-2 text-center">
                              <span className={`inline-block min-w-[40px] rounded-full px-2 py-0.5 text-xs font-bold ${
                                isLowAtt ? "bg-destructive/15 text-destructive" : attPctVal !== null ? "bg-emerald-500/15 text-emerald-700" : "bg-secondary text-muted-foreground"
                              }`}>
                                {attPctVal !== null ? `${attPctVal}%` : "—"}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <span className={`inline-block min-w-[48px] rounded-full px-2.5 py-0.5 text-xs font-bold ${gradeBg(studentTotal)}`}>
                                {studentTotal}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredEnrollments.length === 0 && studentSearch && (
                        <tr>
                          <td colSpan={components.reduce((s, c) => s + c.count, 0) + 3} className="px-4 py-6 text-center text-muted-foreground">
                            No students match "{studentSearch}"
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Class summary */}
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-border bg-card p-4 text-center">
                    <p className={`text-2xl font-bold ${gradeColor(classAvg)}`}>{classAvg > 0 ? `${classAvg}%` : "—"}</p>
                    <p className="text-xs text-muted-foreground">Class Average</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{passingCount}</p>
                    <p className="text-xs text-muted-foreground">Passing (≥50%)</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 text-center">
                    <p className="text-2xl font-bold text-destructive">{failingCount}</p>
                    <p className="text-xs text-muted-foreground">Failing (&lt;50%)</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 text-center">
                    <p className={`text-2xl font-bold ${lowAttCount > 0 ? "text-destructive" : "text-emerald-600"}`}>{lowAttCount}</p>
                    <p className="text-xs text-muted-foreground">Low Attendance</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </ProfessorLayout>
  );
};

export default ProfessorCourseDetail;
