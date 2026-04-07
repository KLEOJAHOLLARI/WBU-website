import { useState } from "react";
import { useParams } from "react-router-dom";
import ProfessorLayout from "@/components/ProfessorLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Save } from "lucide-react";

const ProfessorCourseDetail = () => {
  const { id: courseId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"scheme" | "attendance" | "grades">("scheme");

  const { data: course } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", courseId!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
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

  const { data: enrollments = [] } = useQuery({
    queryKey: ["course-enrollments", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("*, profiles:user_id(full_name, email)")
        .eq("course_id", courseId!);
      if (error) throw error;
      return data as any[];
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

  // Grade component CRUD
  const [newComp, setNewComp] = useState({ name: "", weight: 0, count: 1 });
  const addComponent = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("grade_components").insert({ course_id: courseId!, ...newComp });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grade-components", courseId] });
      setNewComp({ name: "", weight: 0, count: 1 });
      toast({ title: "Component added" });
    },
  });

  const deleteComponent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("grade_components").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grade-components", courseId] });
      toast({ title: "Component removed" });
    },
  });

  // Attendance session
  const [sessionDate, setSessionDate] = useState("");
  const [sessionWeek, setSessionWeek] = useState(1);
  const addSession = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("attendance_sessions").insert({
        course_id: courseId!, session_date: sessionDate, week_number: sessionWeek,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-sessions", courseId] });
      setSessionDate("");
      toast({ title: "Session added" });
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-records", courseId] }),
  });

  // Grade entry
  const saveGrade = useMutation({
    mutationFn: async ({ enrollmentId, componentId, instance, score, maxScore }: any) => {
      const existing = grades.find((g) => g.enrollment_id === enrollmentId && g.grade_component_id === componentId && g.instance_number === instance);
      if (existing) {
        await supabase.from("grades").update({ score, max_score: maxScore }).eq("id", existing.id);
      } else {
        await supabase.from("grades").insert({ enrollment_id: enrollmentId, grade_component_id: componentId, instance_number: instance, score, max_score: maxScore });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades", courseId] });
      toast({ title: "Grade saved" });
    },
  });

  const totalWeight = components.reduce((sum, c) => sum + Number(c.weight) * c.count, 0);
  const inputClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const tabClass = (t: string) => `px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${tab === t ? "bg-card border border-b-0 border-border text-foreground" : "text-muted-foreground hover:text-foreground"}`;

  if (!course) return <ProfessorLayout><p className="text-muted-foreground">Loading course...</p></ProfessorLayout>;

  return (
    <ProfessorLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">{course.name}</h1>
        <p className="text-sm text-muted-foreground">{course.code} · {course.program} · Year {course.year} · Sem {course.semester}</p>
        <p className="text-xs text-muted-foreground">{enrollments.length} students enrolled</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button className={tabClass("scheme")} onClick={() => setTab("scheme")}>Evaluation Scheme</button>
        <button className={tabClass("attendance")} onClick={() => setTab("attendance")}>Attendance</button>
        <button className={tabClass("grades")} onClick={() => setTab("grades")}>Grades</button>
      </div>

      <div className="mt-4">
        {tab === "scheme" && (
          <div>
            <p className="mb-4 text-sm text-muted-foreground">
              Define evaluation components. Total weight: <span className={totalWeight === 100 ? "text-green-600 font-semibold" : "text-destructive font-semibold"}>{totalWeight}%</span> (must equal 100%)
            </p>
            <div className="space-y-2">
              {components.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <span className="flex-1 font-medium text-foreground">{c.name}</span>
                  <span className="text-sm text-muted-foreground">{c.count}× {Number(c.weight)}% = {c.count * Number(c.weight)}%</span>
                  <button onClick={() => deleteComponent.mutate(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 items-end">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">Name</label>
                <input value={newComp.name} onChange={(e) => setNewComp({ ...newComp, name: e.target.value })} className={inputClass} placeholder="e.g. Midterm" />
              </div>
              <div className="w-20">
                <label className="mb-1 block text-xs font-medium text-foreground">Weight %</label>
                <input type="number" value={newComp.weight} onChange={(e) => setNewComp({ ...newComp, weight: Number(e.target.value) })} className={inputClass} />
              </div>
              <div className="w-20">
                <label className="mb-1 block text-xs font-medium text-foreground">Count</label>
                <input type="number" value={newComp.count} onChange={(e) => setNewComp({ ...newComp, count: Number(e.target.value) })} className={inputClass} min={1} />
              </div>
              <button onClick={() => addComponent.mutate()} disabled={!newComp.name} className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </div>
        )}

        {tab === "attendance" && (
          <div>
            <div className="mb-4 flex flex-wrap gap-3 items-end">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">Date</label>
                <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className={inputClass} />
              </div>
              <div className="w-20">
                <label className="mb-1 block text-xs font-medium text-foreground">Week</label>
                <input type="number" value={sessionWeek} onChange={(e) => setSessionWeek(Number(e.target.value))} className={inputClass} min={1} />
              </div>
              <button onClick={() => addSession.mutate()} disabled={!sessionDate} className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                <Plus className="h-4 w-4" /> Add Session
              </button>
            </div>

            {sessions.length === 0 ? (
              <p className="text-muted-foreground">No attendance sessions yet.</p>
            ) : (
              <div className="overflow-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-secondary">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-foreground sticky left-0 bg-secondary z-10">Student</th>
                      {sessions.map((s) => (
                        <th key={s.id} className="px-2 py-2 text-center font-medium text-foreground whitespace-nowrap">
                          W{s.week_number}<br /><span className="text-xs text-muted-foreground">{s.session_date}</span>
                        </th>
                      ))}
                      <th className="px-3 py-2 text-center font-medium text-foreground">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((enr) => {
                      const studentRecords = attendanceRecords.filter((r) => r.enrollment_id === enr.id);
                      const present = studentRecords.filter((r) => r.status === "present").length;
                      const pct = sessions.length > 0 ? Math.round((present / sessions.length) * 100) : 0;
                      return (
                        <tr key={enr.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 font-medium text-foreground sticky left-0 bg-card z-10">
                            {enr.profiles?.full_name || enr.profiles?.email || "Unknown"}
                          </td>
                          {sessions.map((s) => {
                            const rec = studentRecords.find((r) => r.session_id === s.id);
                            const st = rec?.status || "absent";
                            return (
                              <td key={s.id} className="px-2 py-2 text-center">
                                <select
                                  value={st}
                                  onChange={(e) => toggleAttendance.mutate({ sessionId: s.id, enrollmentId: enr.id, status: e.target.value })}
                                  className={`rounded px-1 py-0.5 text-xs font-medium ${st === "present" ? "bg-green-100 text-green-800" : st === "excused" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}
                                >
                                  <option value="present">P</option>
                                  <option value="absent">A</option>
                                  <option value="excused">E</option>
                                </select>
                              </td>
                            );
                          })}
                          <td className={`px-3 py-2 text-center font-semibold ${pct < 75 ? "text-destructive" : "text-green-600"}`}>
                            {pct}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "grades" && (
          <div>
            {components.length === 0 ? (
              <p className="text-muted-foreground">Define evaluation scheme first.</p>
            ) : enrollments.length === 0 ? (
              <p className="text-muted-foreground">No students enrolled yet.</p>
            ) : (
              <div className="overflow-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-secondary">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-foreground sticky left-0 bg-secondary z-10">Student</th>
                      {components.flatMap((c) =>
                        Array.from({ length: c.count }, (_, i) => (
                          <th key={`${c.id}-${i}`} className="px-2 py-2 text-center font-medium text-foreground whitespace-nowrap">
                            {c.name}{c.count > 1 ? ` ${i + 1}` : ""}<br />
                            <span className="text-xs text-muted-foreground">{Number(c.weight)}%</span>
                          </th>
                        ))
                      )}
                      <th className="px-3 py-2 text-center font-medium text-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((enr) => {
                      const studentGrades = grades.filter((g) => g.enrollment_id === enr.id);
                      let totalPct = 0;
                      return (
                        <tr key={enr.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 font-medium text-foreground sticky left-0 bg-card z-10">
                            {enr.profiles?.full_name || "Unknown"}
                          </td>
                          {components.flatMap((c) =>
                            Array.from({ length: c.count }, (_, i) => {
                              const grade = studentGrades.find((g) => g.grade_component_id === c.id && g.instance_number === i + 1);
                              const score = grade?.score ?? "";
                              const maxScore = grade?.max_score ?? 100;
                              if (grade && grade.score !== null) {
                                totalPct += (Number(grade.score) / Number(maxScore)) * Number(c.weight);
                              }
                              return (
                                <td key={`${c.id}-${i}`} className="px-2 py-2 text-center">
                                  <input
                                    type="number"
                                    defaultValue={score?.toString() || ""}
                                    onBlur={(e) => {
                                      const val = e.target.value;
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
                                    className="w-16 rounded border border-input bg-background px-2 py-1 text-center text-sm"
                                    placeholder="—"
                                  />
                                </td>
                              );
                            })
                          )}
                          <td className="px-3 py-2 text-center font-semibold text-foreground">
                            {Math.round(totalPct)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </ProfessorLayout>
  );
};

export default ProfessorCourseDetail;
