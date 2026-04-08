import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, BookOpen } from "lucide-react";

const emptyCourse = { name: "", code: "", program: "", semester: 1, year: 1, professor_id: "" };

const AdminCourses = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").order("program").order("year").order("semester");
      if (error) throw error;
      return data;
    },
  });

  const { data: professors = [] } = useQuery({
    queryKey: ["admin-professors-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("professors").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["admin-programs-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("slug, title").order("title");
      if (error) throw error;
      return data;
    },
  });

  // Also fetch profiles with professor role to map professor_id (auth user) to professor name
  const { data: profProfiles = [] } = useQuery({
    queryKey: ["admin-prof-profiles"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "professor");
      if (!roles || roles.length === 0) return [];
      const userIds = roles.map(r => r.user_id);
      const { data } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds);
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (form: any) => {
      const payload = {
        name: form.name,
        code: form.code || "",
        program: form.program,
        semester: parseInt(form.semester) || 1,
        year: parseInt(form.year) || 1,
        professor_id: form.professor_id || null,
      };
      if (form.id) {
        const { error } = await supabase.from("courses").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("courses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      setShowForm(false);
      setEditing(null);
      toast({ title: "Course saved!" });
    },
    onError: (e: any) => toast({ title: "Error saving course", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      toast({ title: "Course deleted" });
    },
  });

  const openEdit = (c: any) => { setEditing({ ...c }); setShowForm(true); };
  const openNew = () => { setEditing({ ...emptyCourse }); setShowForm(true); };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); saveMutation.mutate(editing); };

  const getProfName = (profId: string | null) => {
    if (!profId) return "—";
    const prof = profProfiles.find(p => p.user_id === profId);
    return prof?.full_name || profId.slice(0, 8);
  };

  const inputCls = "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Courses</h1>
          <p className="text-sm text-muted-foreground">Manage courses and assign professors</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Add Course
        </button>
      </div>

      {showForm && (
        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-foreground">{editing?.id ? "Edit" : "New"} Course</h2>
            <button onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-5 w-5 text-muted-foreground" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <input required placeholder="Course Name" value={editing?.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={inputCls} />
              <input placeholder="Course Code (e.g. CS101)" value={editing?.code || ""} onChange={(e) => setEditing({ ...editing, code: e.target.value })} className={inputCls} />
              <select required value={editing?.program || ""} onChange={(e) => setEditing({ ...editing, program: e.target.value })} className={inputCls}>
                <option value="">Select Program</option>
                {programs.map(p => <option key={p.slug} value={p.slug}>{p.title}</option>)}
              </select>
              <select value={editing?.professor_id || ""} onChange={(e) => setEditing({ ...editing, professor_id: e.target.value })} className={inputCls}>
                <option value="">No Professor Assigned</option>
                {profProfiles.map(p => <option key={p.user_id} value={p.user_id}>{p.full_name} ({p.email})</option>)}
              </select>
              <input type="number" min={1} placeholder="Year" value={editing?.year ?? 1} onChange={(e) => setEditing({ ...editing, year: e.target.value })} className={inputCls} />
              <input type="number" min={1} placeholder="Semester" value={editing?.semester ?? 1} onChange={(e) => setEditing({ ...editing, semester: e.target.value })} className={inputCls} />
            </div>
            <button type="submit" disabled={saveMutation.isPending} className="rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {saveMutation.isPending ? "Saving..." : "Save Course"}
            </button>
          </form>
        </div>
      )}

      <div className="mt-6 overflow-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-foreground">Code</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Program</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Y/S</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Professor</th>
              <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : courses.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No courses yet.</td></tr>
            ) : courses.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.code || "—"}</td>
                <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.program}</td>
                <td className="px-4 py-3 text-muted-foreground">Y{c.year}/S{c.semester}</td>
                <td className="px-4 py-3 text-muted-foreground">{getProfName(c.professor_id)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(c)} className="mr-2 text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => { if (confirm("Delete this course?")) deleteMutation.mutate(c.id); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default AdminCourses;
