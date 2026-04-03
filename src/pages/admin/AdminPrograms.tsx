import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X } from "lucide-react";

const emptyProgram = { slug: "", title: "", faculty: "", degree: "Bachelor", duration: "", description: "", overview: "", careers: "", courses: "" };

const AdminPrograms = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["admin-programs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("*").order("title");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (form: any) => {
      const payload = {
        slug: form.slug,
        title: form.title,
        faculty: form.faculty,
        degree: form.degree,
        duration: form.duration,
        description: form.description,
        overview: form.overview,
        careers: form.careers.split(",").map((s: string) => s.trim()).filter(Boolean),
        courses: form.courses.split(",").map((s: string) => s.trim()).filter(Boolean),
      };
      if (form.id) {
        const { error } = await supabase.from("programs").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("programs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-programs"] });
      setShowForm(false);
      setEditing(null);
      toast({ title: "Program saved!" });
    },
    onError: () => toast({ title: "Error saving program", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("programs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-programs"] });
      toast({ title: "Program deleted" });
    },
  });

  const openEdit = (p: any) => {
    setEditing({
      ...p,
      careers: p.careers?.join(", ") || "",
      courses: p.courses?.join(", ") || "",
    });
    setShowForm(true);
  };

  const openNew = () => {
    setEditing({ ...emptyProgram });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(editing);
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Programs</h1>
          <p className="text-sm text-muted-foreground">Manage study programs</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Add Program</button>
      </div>

      {showForm && (
        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-foreground">{editing?.id ? "Edit" : "New"} Program</h2>
            <button onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-5 w-5 text-muted-foreground" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <input required placeholder="Title" value={editing?.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <input required placeholder="Slug (e.g. computer-science)" value={editing?.slug || ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <input required placeholder="Faculty" value={editing?.faculty || ""} onChange={(e) => setEditing({ ...editing, faculty: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <select value={editing?.degree || "Bachelor"} onChange={(e) => setEditing({ ...editing, degree: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option>Bachelor</option><option>Master</option><option>PhD</option>
              </select>
              <input required placeholder="Duration (e.g. 3 years)" value={editing?.duration || ""} onChange={(e) => setEditing({ ...editing, duration: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <textarea required placeholder="Short description" rows={2} value={editing?.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <textarea required placeholder="Full overview" rows={4} value={editing?.overview || ""} onChange={(e) => setEditing({ ...editing, overview: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <input placeholder="Careers (comma-separated)" value={editing?.careers || ""} onChange={(e) => setEditing({ ...editing, careers: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <input placeholder="Courses (comma-separated)" value={editing?.courses || ""} onChange={(e) => setEditing({ ...editing, courses: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <button type="submit" disabled={saveMutation.isPending} className="rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {saveMutation.isPending ? "Saving..." : "Save Program"}
            </button>
          </form>
        </div>
      )}

      <div className="mt-6 overflow-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-foreground">Title</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Faculty</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Degree</th>
              <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : programs.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">{p.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.faculty}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.degree}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(p)} className="mr-2 text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => { if (confirm("Delete this program?")) deleteMutation.mutate(p.id); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default AdminPrograms;
