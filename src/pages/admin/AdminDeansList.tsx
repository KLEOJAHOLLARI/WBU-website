import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Award, Trophy, Sparkles, Download, RefreshCw, UserPlus, Trash2, Eye, Medal } from "lucide-react";
import { toast } from "sonner";
import { downloadDeansListCertificate } from "@/lib/deansListCertificate";

const AdminDeansList = () => {
  const qc = useQueryClient();
  const [threshold, setThreshold] = useState<number>(9.0);
  const [minCourses, setMinCourses] = useState<number>(3);
  const [semesterId, setSemesterId] = useState<string>("");
  const [program, setProgram] = useState<string>("all");
  const [listTitle, setListTitle] = useState<string>("President's Honor List");
  const [generating, setGenerating] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["deans-list-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("system_settings").select("value").eq("key", "deans_list").maybeSingle();
      const v: any = data?.value || {};
      setThreshold(Number(v.threshold_gpa ?? 9.0));
      setMinCourses(Number(v.min_courses ?? 3));
      return v;
    },
  });

  const { data: semesters = [] } = useQuery({
    queryKey: ["all-semesters"],
    queryFn: async () => {
      const { data } = await supabase.from("academic_semesters").select("id, name, is_current").order("start_date", { ascending: false });
      const list = data || [];
      const cur = list.find((s: any) => s.is_current) || list[0];
      if (cur && !semesterId) setSemesterId(cur.id);
      return list;
    },
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["distinct-programs"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("program");
      const set = new Set<string>();
      (data || []).forEach((r: any) => r.program && set.add(r.program));
      return Array.from(set).sort();
    },
  });

  const { data: snapshot, isLoading: loadingSnap, refetch } = useQuery({
    queryKey: ["deans-snapshot", semesterId, program],
    queryFn: async () => {
      if (!semesterId) return null;
      let q = supabase.from("deans_list_snapshots").select("*").eq("semester_id", semesterId);
      if (program === "all") q = q.is("program", null); else q = q.eq("program", program);
      const { data } = await q.maybeSingle();
      return data;
    },
    enabled: !!semesterId,
  });

  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ["deans-entries", snapshot?.id],
    queryFn: async () => {
      if (!snapshot?.id) return [];
      const { data } = await supabase.from("deans_list_entries").select("*").eq("snapshot_id", snapshot.id).order("rank");
      return data || [];
    },
    enabled: !!snapshot?.id,
  });

  const semesterName = useMemo(
    () => semesters.find((s: any) => s.id === semesterId)?.name || "",
    [semesters, semesterId]
  );

  const saveSettings = async () => {
    const { error } = await supabase.from("system_settings").upsert(
      { key: "deans_list", value: { threshold_gpa: threshold, min_courses: minCourses } },
      { onConflict: "key" }
    );
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["deans-list-settings"] });
  };

  const generate = async () => {
    if (!semesterId) return toast.error("Pick a semester");
    setGenerating(true);
    const { data, error } = await supabase.rpc("generate_deans_list", {
      _semester_id: semesterId,
      _program: program === "all" ? null : program,
      _threshold: threshold,
      _min_courses: minCourses,
    });
    setGenerating(false);
    if (error) return toast.error(error.message);
    const res: any = data;
    // Persist chosen list title and auto-publish so the list shows on the public page
    if (res?.snapshot_id) {
      await supabase.from("deans_list_snapshots")
        .update({ list_title: listTitle, is_published: true, published_at: new Date().toISOString() })
        .eq("id", res.snapshot_id);
    }
    toast.success(`Generated & published — ${res?.count ?? 0} student(s) qualified`);
    qc.invalidateQueries({ queryKey: ["deans-snapshot"] });
    qc.invalidateQueries({ queryKey: ["deans-entries"] });
  };

  const togglePublish = async (next: boolean) => {
    if (!snapshot?.id) return;
    const { error } = await supabase
      .from("deans_list_snapshots")
      .update({ is_published: next, published_at: next ? new Date().toISOString() : null })
      .eq("id", snapshot.id);
    if (error) return toast.error(error.message);
    toast.success(next ? "Published publicly" : "Unpublished");
    refetch();
  };

  const exportCert = async (e: any) => {
    await downloadDeansListCertificate({
      fullName: e.full_name,
      program: e.program,
      semesterName,
      gpaAlbanian: Number(e.gpa_albanian),
      gpa4: Number(e.gpa_4),
      rank: e.rank,
      certificateCode: e.certificate_code,
    });
  };

  // ---- Manual add ----
  const [addOpen, setAddOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [filterProgram, setFilterProgram] = useState<string>("all");
  const [pickedStudent, setPickedStudent] = useState<any>(null);
  const [manualRank, setManualRank] = useState<number | "">("");
  const [manualGpa10, setManualGpa10] = useState<number | "">("");
  const [manualGpa4, setManualGpa4] = useState<number | "">("");
  const [manualProgram, setManualProgram] = useState<string>("");
  const [adding, setAdding] = useState(false);

  const { data: allStudents = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["honor-all-students"],
    enabled: addOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, student_id, program")
        .order("full_name", { ascending: true })
        .limit(2000);
      return data || [];
    },
  });

  const studentPrograms = useMemo(() => {
    const set = new Set<string>();
    allStudents.forEach((s: any) => s.program && set.add(s.program));
    return Array.from(set).sort();
  }, [allStudents]);

  const filteredStudents = useMemo(() => {
    const term = studentSearch.trim().toLowerCase();
    return allStudents.filter((s: any) => {
      if (filterProgram !== "all" && s.program !== filterProgram) return false;
      if (!term) return true;
      return (
        (s.full_name || "").toLowerCase().includes(term) ||
        (s.email || "").toLowerCase().includes(term) ||
        (s.student_id || "").toLowerCase().includes(term)
      );
    });
  }, [allStudents, studentSearch, filterProgram]);

  const groupedStudents = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredStudents.forEach((s: any) => {
      const key = s.program || "Unassigned";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredStudents]);

  const openAddDialog = () => {
    const nextRank = (entries.reduce((m: number, e: any) => Math.max(m, e.rank || 0), 0) || 0) + 1;
    setPickedStudent(null);
    setStudentSearch("");
    setFilterProgram(program === "all" ? "all" : program);
    setManualRank(nextRank);
    setManualGpa10("");
    setManualGpa4("");
    setManualProgram(program === "all" ? "" : program);
    setAddOpen(true);
  };

  const submitManual = async () => {
    if (!snapshot?.id) return toast.error("Generate a snapshot first (click Generate / Update)");
    if (!pickedStudent) return toast.error("Pick a student");
    if (!manualRank || !manualGpa10 || !manualGpa4) return toast.error("Fill rank and GPAs");
    setAdding(true);
    const { error } = await supabase.from("deans_list_entries").insert({
      snapshot_id: snapshot.id,
      user_id: pickedStudent.user_id,
      full_name: pickedStudent.full_name || pickedStudent.email || "",
      program: manualProgram || pickedStudent.program || "",
      rank: Number(manualRank),
      gpa_albanian: Number(manualGpa10),
      gpa_4: Number(manualGpa4),
    });
    setAdding(false);
    if (error) return toast.error(error.message);
    toast.success("Student added to honor list");
    setAddOpen(false);
    qc.invalidateQueries({ queryKey: ["deans-entries", snapshot.id] });
  };

  const removeEntry = async (id: string) => {
    if (!confirm("Remove this student from the list?")) return;
    const { error } = await supabase.from("deans_list_entries").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    qc.invalidateQueries({ queryKey: ["deans-entries", snapshot?.id] });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Trophy className="h-7 w-7 text-primary" /> Dean's List Management</h1>
            <p className="text-muted-foreground mt-1">Recognize top-performing students per semester. Honors are computed from real graded coursework.</p>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Default Settings</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label>GPA threshold (Albanian, ≥)</Label>
              <Input type="number" step="0.1" min={4} max={10} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
            </div>
            <div>
              <Label>Minimum completed courses</Label>
              <Input type="number" min={1} value={minCourses} onChange={(e) => setMinCourses(Number(e.target.value))} />
            </div>
            <div className="flex items-end">
              <Button onClick={saveSettings} variant="outline">Save defaults</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Generate / Manage List</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Semester / Academic Year</Label>
                <Select value={semesterId} onValueChange={setSemesterId}>
                  <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
                  <SelectContent>
                    {semesters.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Program</Label>
                <Select value={program} onValueChange={setProgram}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All programs</SelectItem>
                    {programs.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>List Title</Label>
                <Select value={listTitle} onValueChange={setListTitle}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="President's Honor List">President's Honor List</SelectItem>
                    <SelectItem value="Dean's List">Dean's List</SelectItem>
                    <SelectItem value="Honors List">Honors List</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={generate} disabled={generating || !semesterId}>
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Generate / Update
                </Button>
              </div>
            </div>

            {snapshot && (
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 flex-wrap gap-3">
                <div className="text-sm">
                  <div><strong>Threshold:</strong> {Number(snapshot.threshold_gpa).toFixed(2)} • <strong>Generated:</strong> {new Date(snapshot.generated_at).toLocaleString()}</div>
                  <div className="text-muted-foreground">Snapshot ID: {snapshot.id.slice(0, 8)}…</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={snapshot.is_published ? "default" : "secondary"}>
                    {snapshot.is_published ? "Published" : "Draft"}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Switch checked={snapshot.is_published} onCheckedChange={togglePublish} id="pub" />
                    <Label htmlFor="pub" className="cursor-pointer">Publish to public page</Label>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => refetch()}><RefreshCw className="h-3.5 w-3.5 mr-1" />Refresh</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" /> Ranked Students</CardTitle>
            <Button size="sm" variant="outline" onClick={openAddDialog}>
              <UserPlus className="h-4 w-4 mr-1" /> Add student manually
            </Button>
          </CardHeader>
          <CardContent>
            {loadingSnap || loadingEntries ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : !snapshot ? (
              <p className="text-muted-foreground text-sm">No snapshot yet for this selection. Click "Generate / Update".</p>
            ) : entries.length === 0 ? (
              <p className="text-muted-foreground text-sm">No students met the threshold. You can add one manually.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead className="text-right">GPA (10)</TableHead>
                    <TableHead className="text-right">GPA (4.0)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-bold">#{e.rank}</TableCell>
                      <TableCell>{e.full_name}</TableCell>
                      <TableCell>{e.program}</TableCell>
                      <TableCell className="text-right">{Number(e.gpa_albanian).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{Number(e.gpa_4).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => exportCert(e)}>
                          <Download className="h-3.5 w-3.5 mr-1" /> PDF
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => removeEntry(e.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add student to honor list</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {!snapshot?.id && (
                <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-900 px-3 py-2 text-sm">
                  No snapshot exists for this semester/program yet. Click <strong>Generate / Update</strong> first, then come back to add students manually.
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Search</Label>
                  <Input
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Name, email, or student ID…"
                  />
                </div>
                <div>
                  <Label>Filter by program / department</Label>
                  <Select value={filterProgram} onValueChange={setFilterProgram}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All programs</SelectItem>
                      {studentPrograms.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-md border">
                {loadingStudents ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : groupedStudents.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">No students match.</div>
                ) : (
                  groupedStudents.map(([prog, list]) => (
                    <div key={prog}>
                      <div className="sticky top-0 bg-muted/80 backdrop-blur px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b">
                        {prog} <span className="text-muted-foreground/70 normal-case">({list.length})</span>
                      </div>
                      {list.map((s: any) => (
                        <button
                          key={s.user_id}
                          type="button"
                          onClick={() => { setPickedStudent(s); if (s.program) setManualProgram(s.program); }}
                          className={`w-full text-left px-3 py-2 text-sm border-b hover:bg-muted ${pickedStudent?.user_id === s.user_id ? "bg-primary/10" : ""}`}
                        >
                          <div className="font-medium">{s.full_name || "(no name)"}</div>
                          <div className="text-xs text-muted-foreground">{s.email}{s.student_id ? ` • ${s.student_id}` : ""}</div>
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>

              {pickedStudent && (
                <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2 text-sm">
                  Selected: <strong>{pickedStudent.full_name || pickedStudent.email}</strong>
                  {pickedStudent.program ? <span className="text-muted-foreground"> — {pickedStudent.program}</span> : null}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Rank</Label>
                  <Input type="number" min={1} value={manualRank} onChange={(e) => setManualRank(e.target.value === "" ? "" : Number(e.target.value))} />
                </div>
                <div>
                  <Label>GPA (10)</Label>
                  <Input type="number" step="0.01" min={0} max={10} value={manualGpa10} onChange={(e) => setManualGpa10(e.target.value === "" ? "" : Number(e.target.value))} />
                </div>
                <div>
                  <Label>GPA (4.0)</Label>
                  <Input type="number" step="0.01" min={0} max={4} value={manualGpa4} onChange={(e) => setManualGpa4(e.target.value === "" ? "" : Number(e.target.value))} />
                </div>
              </div>
              <div>
                <Label>Program (override)</Label>
                <Input value={manualProgram} onChange={(e) => setManualProgram(e.target.value)} placeholder="e.g. computer-science" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={submitManual} disabled={adding || !snapshot?.id}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                Add to list
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminDeansList;
