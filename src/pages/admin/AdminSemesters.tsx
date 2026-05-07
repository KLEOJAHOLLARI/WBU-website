import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarDays, Plus, Pencil, Trash2, Archive } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SemesterForm {
  name: string;
  year: number;
  semester: number;
  start_date: string;
  end_date: string;
  enrollment_open: boolean;
  enrollment_deadline: string;
  is_current: boolean;
  status: string;
  feedback_enabled: boolean;
}

const empty: SemesterForm = { name: "", year: 1, semester: 1, start_date: "", end_date: "", enrollment_open: false, enrollment_deadline: "", is_current: false, status: "active", feedback_enabled: false };

const AdminSemesters = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<SemesterForm>(empty);

  const { data: semesters = [], isLoading } = useQuery({
    queryKey: ["admin-semesters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academic_semesters")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (f: SemesterForm & { id?: string }) => {
      const payload = {
        name: f.name,
        year: f.year,
        semester: f.semester,
        start_date: f.start_date,
        end_date: f.end_date,
        enrollment_open: f.enrollment_open,
        enrollment_deadline: f.enrollment_deadline || null,
        is_current: f.is_current,
        status: f.status,
        feedback_enabled: f.feedback_enabled,
      };

      if (f.id) {
        const { error } = await supabase.from("academic_semesters").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("academic_semesters").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-semesters"] });
      qc.invalidateQueries({ queryKey: ["active-semester"] });
      toast.success(editing ? "Semester updated" : "Semester created");
      setOpen(false);
      setEditing(null);
      setForm(empty);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("academic_semesters").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-semesters"] });
      qc.invalidateQueries({ queryKey: ["active-semester"] });
      toast.success("Semester deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (s: any) => {
    setEditing(s.id);
    setForm({
      name: s.name,
      year: s.year ?? 1,
      semester: s.semester ?? 1,
      start_date: s.start_date,
      end_date: s.end_date,
      enrollment_open: s.enrollment_open,
      enrollment_deadline: s.enrollment_deadline || "",
      is_current: s.is_current,
      status: s.status ?? "active",
      feedback_enabled: !!s.feedback_enabled,
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.start_date || !form.end_date) {
      toast.error("Please fill required fields");
      return;
    }
    saveMutation.mutate(editing ? { ...form, id: editing } : form);
  };

  const toggleEnrollment = async (id: string, current: boolean) => {
    const { error } = await supabase.from("academic_semesters").update({ enrollment_open: !current }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey: ["admin-semesters"] });
      toast.success(!current ? "Enrollment opened" : "Enrollment closed");
    }
  };

  const archiveSemester = async (id: string) => {
    const { error } = await supabase.from("academic_semesters").update({ status: "archived", is_current: false }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey: ["admin-semesters"] });
      qc.invalidateQueries({ queryKey: ["active-semester"] });
      toast.success("Semester archived");
    }
  };

  const toggleFeedback = async (id: string, current: boolean) => {
    const { error } = await supabase.from("academic_semesters").update({ feedback_enabled: !current }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey: ["admin-semesters"] });
      qc.invalidateQueries({ queryKey: ["active-campaign"] });
      toast.success(!current ? "Professor feedback enabled" : "Professor feedback disabled");
    }
  };

    const { error } = await supabase.from("academic_semesters").update({ is_current: true, status: "active" }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey: ["admin-semesters"] });
      qc.invalidateQueries({ queryKey: ["active-semester"] });
      toast.success("Semester set as current");
    }
  };

  const activeSemesters = semesters.filter((s: any) => (s.status ?? "active") !== "archived");
  const archivedSemesters = semesters.filter((s: any) => (s.status ?? "active") === "archived");

  const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-6 w-6" /> Semester Management
          </h1>
          <p className="mt-1 text-muted-foreground">Manage academic calendar, enrollment periods, and active semester</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(empty); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Semester</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Semester" : "New Semester"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input placeholder="e.g. Fall 2026" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Academic Year</Label>
                  <select value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} className={selectClass}>
                    {[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Semester</Label>
                  <select value={form.semester} onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })} className={selectClass}>
                    {[1, 2].map((s) => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date *</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div>
                  <Label>End Date *</Label>
                  <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Enrollment Deadline</Label>
                <Input type="date" value={form.enrollment_deadline} onChange={(e) => setForm({ ...form, enrollment_deadline: e.target.value })} />
              </div>
              <div>
                <Label>Status</Label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={selectClass}>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.enrollment_open} onCheckedChange={(v) => setForm({ ...form, enrollment_open: v })} />
                <Label>Enrollment Open</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_current} onCheckedChange={(v) => setForm({ ...form, is_current: v })} />
                <Label>Current Semester (system-wide active)</Label>
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : editing ? "Update" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current semester card */}
      {semesters.filter((s: any) => s.is_current).map((s: any) => (
        <Card key={s.id} className="mt-6 border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              📅 Current Semester: {s.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>Year {s.year ?? "?"} · Semester {s.semester ?? "?"}</span>
            <span>{s.start_date} → {s.end_date}</span>
            {s.enrollment_deadline && <span>Deadline: {s.enrollment_deadline}</span>}
            <Badge variant={s.enrollment_open ? "default" : "secondary"}>
              {s.enrollment_open ? "Enrollment Open" : "Enrollment Closed"}
            </Badge>
          </CardContent>
        </Card>
      ))}

      {/* Active semesters */}
      <div className="mt-6 rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Year / Sem</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Enrollment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : activeSemesters.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No active semesters</TableCell></TableRow>
            ) : activeSemesters.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-muted-foreground text-xs">Year {s.year ?? "?"} · Sem {s.semester ?? "?"}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{s.start_date} → {s.end_date}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => toggleEnrollment(s.id, s.enrollment_open)}>
                    <Badge variant={s.enrollment_open ? "default" : "secondary"} className="cursor-pointer">
                      {s.enrollment_open ? "Open" : "Closed"}
                    </Badge>
                  </Button>
                </TableCell>
                <TableCell>
                  {s.is_current ? (
                    <Badge className="bg-green-100 text-green-700">Current</Badge>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setAsCurrent(s.id)}>Set as Current</Button>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => archiveSemester(s.id)}><Archive className="h-4 w-4 text-muted-foreground" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Archived semesters */}
      {archivedSemesters.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 font-display text-lg font-semibold text-muted-foreground flex items-center gap-2">
            <Archive className="h-5 w-5" /> Archived Semesters
          </h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Year / Sem</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archivedSemesters.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-muted-foreground">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">Year {s.year ?? "?"} · Sem {s.semester ?? "?"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{s.start_date} → {s.end_date}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminSemesters;
