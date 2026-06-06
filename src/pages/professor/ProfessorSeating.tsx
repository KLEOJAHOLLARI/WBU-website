import ProfessorLayout from "@/components/ProfessorLayout";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Armchair, RotateCcw, Shuffle, Save } from "lucide-react";

type Course = { id: string; name: string; code: string };
type Chart = { id: string; course_id: string; rows: number; cols: number; label: string };
type Seat = { id: string; chart_id: string; user_id: string; row_index: number; col_index: number };
type Student = { user_id: string; full_name: string; email: string };

const ProfessorSeating = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [courseId, setCourseId] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const { data: courses = [] } = useQuery({
    queryKey: ["prof-courses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses").select("id, name, code")
        .eq("professor_id", user!.id).order("name");
      if (error) throw error;
      return data as Course[];
    },
    enabled: !!user,
  });

  const { data: chart } = useQuery({
    queryKey: ["seating-chart", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seating_charts").select("*").eq("course_id", courseId).maybeSingle();
      if (error) throw error;
      return data as Chart | null;
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["course-students", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data: enr, error } = await supabase
        .from("enrollments").select("user_id").eq("course_id", courseId);
      if (error) throw error;
      const ids = enr.map((e) => e.user_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase
        .from("profiles").select("user_id, full_name, email").in("user_id", ids);
      return (profs || []) as Student[];
    },
  });

  const { data: seats = [] } = useQuery({
    queryKey: ["seats", chart?.id],
    enabled: !!chart?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seat_assignments").select("*").eq("chart_id", chart!.id);
      if (error) throw error;
      return data as Seat[];
    },
  });

  const [rowsInput, setRowsInput] = useState(5);
  const [colsInput, setColsInput] = useState(6);
  const [labelInput, setLabelInput] = useState("Classroom");

  const createChart = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("seating_charts").insert({
        course_id: courseId, rows: rowsInput, cols: colsInput,
        label: labelInput, created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chart created");
      qc.invalidateQueries({ queryKey: ["seating-chart", courseId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateChart = useMutation({
    mutationFn: async (patch: Partial<Chart>) => {
      const { error } = await supabase.from("seating_charts").update(patch).eq("id", chart!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["seating-chart", courseId] }),
  });

  const assignSeat = useMutation({
    mutationFn: async ({ userId, r, c }: { userId: string; r: number; c: number }) => {
      // remove user from any existing seat & remove anyone in the target seat
      await supabase.from("seat_assignments").delete().eq("chart_id", chart!.id).eq("user_id", userId);
      await supabase.from("seat_assignments").delete().eq("chart_id", chart!.id).eq("row_index", r).eq("col_index", c);
      const { error } = await supabase.from("seat_assignments").insert({
        chart_id: chart!.id, user_id: userId, row_index: r, col_index: c,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seats", chart?.id] });
      setSelectedStudent(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const clearSeat = useMutation({
    mutationFn: async ({ r, c }: { r: number; c: number }) => {
      const { error } = await supabase.from("seat_assignments").delete()
        .eq("chart_id", chart!.id).eq("row_index", r).eq("col_index", c);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["seats", chart?.id] }),
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("seat_assignments").delete().eq("chart_id", chart!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["seats", chart?.id] }),
  });

  const autoAssign = useMutation({
    mutationFn: async () => {
      const capacity = chart!.rows * chart!.cols;
      const shuffled = [...enrollments].sort(() => Math.random() - 0.5).slice(0, capacity);
      await supabase.from("seat_assignments").delete().eq("chart_id", chart!.id);
      const rows: any[] = shuffled.map((s, i) => ({
        chart_id: chart!.id, user_id: s.user_id,
        row_index: Math.floor(i / chart!.cols), col_index: i % chart!.cols,
      }));
      if (rows.length) {
        const { error } = await supabase.from("seat_assignments").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Seats auto-assigned"); qc.invalidateQueries({ queryKey: ["seats", chart?.id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const seatMap = useMemo(() => {
    const m = new Map<string, Seat>();
    seats.forEach((s) => m.set(`${s.row_index}-${s.col_index}`, s));
    return m;
  }, [seats]);

  const studentMap = useMemo(() => {
    const m = new Map<string, Student>();
    enrollments.forEach((e) => m.set(e.user_id, e));
    return m;
  }, [enrollments]);

  const assignedIds = new Set(seats.map((s) => s.user_id));
  const unassigned = enrollments.filter((e) => !assignedIds.has(e.user_id));

  return (
    <ProfessorLayout>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Armchair className="h-6 w-6" /> Seating Chart
          </h1>
          <p className="text-sm text-muted-foreground">Assign students to seats in your classroom or auditorium</p>
        </div>
        <div className="w-full sm:w-72">
          <Select value={courseId} onValueChange={(v) => { setCourseId(v); setSelectedStudent(null); }}>
            <SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!courseId ? (
        <div className="mt-10 rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          Select one of your courses to manage its seating.
        </div>
      ) : !chart ? (
        <div className="mt-6 rounded-xl border border-border bg-card p-6 max-w-md">
          <h2 className="font-semibold text-foreground mb-3">Create seating chart</h2>
          <div className="space-y-3">
            <div><Label>Room label</Label><Input value={labelInput} onChange={(e) => setLabelInput(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Rows</Label><Input type="number" min={1} max={30} value={rowsInput} onChange={(e) => setRowsInput(parseInt(e.target.value) || 1)} /></div>
              <div><Label>Columns</Label><Input type="number" min={1} max={30} value={colsInput} onChange={(e) => setColsInput(parseInt(e.target.value) || 1)} /></div>
            </div>
            <Button onClick={() => createChart.mutate()} disabled={createChart.isPending} className="w-full">
              <Save className="h-4 w-4 mr-1" /> Create chart
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Input value={chart.label} onChange={(e) => updateChart.mutate({ label: e.target.value })} className="w-48" />
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>Rows</span>
                <Input type="number" min={1} max={30} value={chart.rows} onChange={(e) => updateChart.mutate({ rows: parseInt(e.target.value) || 1 })} className="w-16 h-8" />
                <span>Cols</span>
                <Input type="number" min={1} max={30} value={chart.cols} onChange={(e) => updateChart.mutate({ cols: parseInt(e.target.value) || 1 })} className="w-16 h-8" />
              </div>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={() => autoAssign.mutate()}>
                  <Shuffle className="h-4 w-4 mr-1" /> Auto-assign
                </Button>
                <Button size="sm" variant="outline" onClick={() => clearAll.mutate()}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Clear all
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 overflow-auto">
              <div className="mx-auto mb-4 w-full max-w-md text-center text-[11px] uppercase tracking-wider text-muted-foreground border-b-2 border-primary/40 pb-2">
                Front / Board
              </div>
              <div
                className="grid gap-2 mx-auto"
                style={{ gridTemplateColumns: `repeat(${chart.cols}, minmax(56px, 1fr))`, maxWidth: chart.cols * 80 }}
              >
                {Array.from({ length: chart.rows }).map((_, r) =>
                  Array.from({ length: chart.cols }).map((_, c) => {
                    const seat = seatMap.get(`${r}-${c}`);
                    const student = seat ? studentMap.get(seat.user_id) : null;
                    const initials = student?.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "";
                    return (
                      <button
                        key={`${r}-${c}`}
                        onClick={() => {
                          if (selectedStudent) {
                            assignSeat.mutate({ userId: selectedStudent, r, c });
                          } else if (seat) {
                            clearSeat.mutate({ r, c });
                          }
                        }}
                        title={student?.full_name || `Row ${r + 1}, Col ${c + 1}`}
                        className={`aspect-square rounded-lg border text-[11px] font-semibold flex flex-col items-center justify-center transition-all ${
                          seat
                            ? "bg-primary/10 border-primary text-primary hover:bg-primary/20"
                            : selectedStudent
                            ? "border-dashed border-primary/50 hover:bg-primary/5"
                            : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {seat ? (
                          <>
                            <span className="text-sm">{initials}</span>
                            <span className="text-[9px] opacity-70 truncate w-full px-1">{student?.full_name?.split(" ")[0]}</span>
                          </>
                        ) : (
                          <span className="opacity-50">{r + 1}·{c + 1}</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                {selectedStudent ? "Click a seat to place the selected student" : "Click an occupied seat to clear it, or pick a student on the right"}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-semibold text-foreground mb-2 text-sm">
              Unassigned students ({unassigned.length}/{enrollments.length})
            </h3>
            {enrollments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No students enrolled yet.</p>
            ) : (
              <div className="space-y-1 max-h-[500px] overflow-auto">
                {unassigned.map((s) => (
                  <button
                    key={s.user_id}
                    onClick={() => setSelectedStudent(selectedStudent === s.user_id ? null : s.user_id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition ${
                      selectedStudent === s.user_id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <p className="font-medium truncate">{s.full_name}</p>
                    <p className="text-[10px] opacity-70 truncate">{s.email}</p>
                  </button>
                ))}
                {unassigned.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">All students are seated 🎉</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </ProfessorLayout>
  );
};

export default ProfessorSeating;
