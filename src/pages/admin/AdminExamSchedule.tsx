import { useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Eye, EyeOff, CalendarDays, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ExamRow = {
  id: string;
  program: string;
  course_id: string | null;
  exam_date: string;
  start_time: string;
  end_time: string;
  room: string;
  exam_type: string;
  notes: string | null;
  is_published: boolean;
  supervisor_name: string;
  courses?: { id: string; name: string; code: string; year: number; semester: number; program: string } | null;
};

type FormState = {
  program: string;
  course_id: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  room: string;
  exam_type: string;
  notes: string;
  supervisor_name: string;
  is_published: boolean;
};

const emptyForm: FormState = {
  program: "",
  course_id: "",
  exam_date: new Date().toISOString().slice(0, 10),
  start_time: "09:00",
  end_time: "11:00",
  room: "",
  exam_type: "final",
  notes: "",
  supervisor_name: "",
  is_published: true,
};

const typeColors: Record<string, string> = {
  final: "bg-primary/10 text-primary border-primary/20",
  midterm: "bg-amber-100 text-amber-700 border-amber-200",
  retake: "bg-red-100 text-red-700 border-red-200",
  quiz: "bg-blue-100 text-blue-700 border-blue-200",
};

const AdminExamSchedule = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterProgram, setFilterProgram] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: programs = [] } = useQuery({
    queryKey: ["admin-programs-list"],
    queryFn: async () => {
      const { data } = await supabase.from("programs").select("slug, title").order("title");
      return data ?? [];
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["admin-courses-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, name, code, program, year, semester")
        .order("name");
      return data ?? [];
    },
  });

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ["admin-exam-schedule"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_schedule")
        .select("*, courses(id, name, code, year, semester, program)")
        .order("exam_date", { ascending: false })
        .order("start_time");
      if (error) throw error;
      return (data ?? []) as unknown as ExamRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exams.filter((e) => {
      if (filterProgram !== "all" && e.program !== filterProgram) return false;
      if (filterType !== "all" && e.exam_type !== filterType) return false;
      if (filterStatus === "published" && !e.is_published) return false;
      if (filterStatus === "draft" && e.is_published) return false;
      if (!q) return true;
      const hay = [
        e.courses?.name, e.courses?.code, e.program, e.room,
        e.supervisor_name, e.notes, e.exam_type,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [exams, search, filterProgram, filterType, filterStatus]);

  const coursesForProgram = useMemo(
    () => courses.filter((c) => !form.program || c.program === form.program),
    [courses, form.program]
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (e: ExamRow) => {
    setEditingId(e.id);
    setForm({
      program: e.program,
      course_id: e.course_id ?? "",
      exam_date: e.exam_date,
      start_time: e.start_time,
      end_time: e.end_time,
      room: e.room ?? "",
      exam_type: e.exam_type,
      notes: e.notes ?? "",
      supervisor_name: e.supervisor_name ?? "",
      is_published: e.is_published,
    });
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        program: form.program,
        course_id: form.course_id || null,
        exam_date: form.exam_date,
        start_time: form.start_time,
        end_time: form.end_time,
        room: form.room,
        exam_type: form.exam_type,
        notes: form.notes || null,
        supervisor_name: form.supervisor_name,
        is_published: form.is_published,
      };
      if (editingId) {
        const { error } = await supabase.from("exam_schedule").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("exam_schedule").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exam-schedule"] });
      toast({ title: editingId ? "Exam updated" : "Exam created" });
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exam_schedule").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exam-schedule"] });
      toast({ title: "Exam deleted" });
      setConfirmDelete(null);
    },
    onError: (e: any) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase
        .from("exam_schedule")
        .update({ is_published: published } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-exam-schedule"] }),
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.program) {
      toast({ title: "Program is required", variant: "destructive" });
      return;
    }
    if (!form.exam_date || !form.start_time || !form.end_time) {
      toast({ title: "Date and time are required", variant: "destructive" });
      return;
    }
    saveMutation.mutate();
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-6 w-6" /> Exam Schedule
          </h1>
          <p className="mt-1 text-muted-foreground">Create and manage midterm, final, and retake exams</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Exam</Button>
      </div>

      {/* Filters */}
      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search course, room, supervisor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterProgram} onValueChange={setFilterProgram}>
          <SelectTrigger><SelectValue placeholder="All programs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All programs</SelectItem>
            {programs.map((p) => (
              <SelectItem key={p.slug} value={p.slug}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="midterm">Midterm</SelectItem>
            <SelectItem value="final">Final</SelectItem>
            <SelectItem value="retake">Retake</SelectItem>
            <SelectItem value="quiz">Quiz</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mt-6 rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">{editingId ? "Edit Exam" : "New Exam"}</h2>
            <Button type="button" variant="ghost" size="icon" onClick={() => { setShowForm(false); setEditingId(null); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Program *</Label>
              <Select value={form.program} onValueChange={(v) => setForm({ ...form, program: v, course_id: "" })}>
                <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p.slug} value={p.slug}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Course</Label>
              <Select value={form.course_id || "none"} onValueChange={(v) => setForm({ ...form, course_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No specific course —</SelectItem>
                  {coursesForProgram.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.code ? `(${c.code})` : ""} · Y{c.year} S{c.semester}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Exam Type *</Label>
              <Select value={form.exam_type} onValueChange={(v) => setForm({ ...form, exam_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="midterm">Midterm</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                  <SelectItem value="retake">Retake</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Supervisor / Professor</Label>
              <Input value={form.supervisor_name} onChange={(e) => setForm({ ...form, supervisor_name: e.target.value })} placeholder="Prof. Name" />
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" value={form.exam_date} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} />
            </div>
            <div>
              <Label>Room / Location</Label>
              <Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="A-201" />
            </div>
            <div>
              <Label>Start Time *</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div>
              <Label>End Time *</Label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Materials allowed, instructions…" />
            </div>
            <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Published</p>
                <p className="text-xs text-muted-foreground">Visible to students when on</p>
              </div>
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : editingId ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="mt-6 rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Supervisor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No exams found</TableCell></TableRow>
            ) : filtered.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">
                  <Link to={`/portal/exams/${e.id}`} className="hover:text-primary hover:underline">
                    {e.courses?.name || "—"}
                    {e.courses?.code && <span className="ml-1 text-xs text-muted-foreground">({e.courses.code})</span>}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{e.program}</TableCell>
                <TableCell>
                  <Badge className={typeColors[e.exam_type] || "bg-muted"}>{e.exam_type}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">{new Date(e.exam_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</TableCell>
                <TableCell className="whitespace-nowrap">{e.start_time}–{e.end_time}</TableCell>
                <TableCell>{e.room || "TBD"}</TableCell>
                <TableCell className="text-sm">{e.supervisor_name || "—"}</TableCell>
                <TableCell>
                  <Badge variant={e.is_published ? "default" : "secondary"}>
                    {e.is_published ? "Published" : "Draft"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost" size="icon"
                      title={e.is_published ? "Unpublish" : "Publish"}
                      onClick={() => togglePublish.mutate({ id: e.id, published: !e.is_published })}
                    >
                      {e.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(e)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(e.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete exam?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminExamSchedule;
