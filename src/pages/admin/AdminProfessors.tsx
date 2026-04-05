import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X } from "lucide-react";

const emptyProf = { name: "", title: "", department: "", bio: "", photo_url: "", display_order: 0 };

const AdminProfessors = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: professors = [], isLoading } = useQuery({
    queryKey: ["admin-professors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("professors").select("*").order("display_order").order("name");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (form: any) => {
      const payload = {
        name: form.name,
        title: form.title,
        department: form.department,
        bio: form.bio || "",
        photo_url: form.photo_url || null,
        display_order: parseInt(form.display_order) || 0,
      };
      if (form.id) {
        const { error } = await supabase.from("professors").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("professors").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-professors"] });
      setShowForm(false);
      setEditing(null);
      toast({ title: "Professor saved!" });
    },
    onError: () => toast({ title: "Error saving professor", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("professors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-professors"] });
      toast({ title: "Professor deleted" });
    },
  });

  const openEdit = (p: any) => {
    setEditing({ ...p });
    setShowForm(true);
  };

  const openNew = () => {
    setEditing({ ...emptyProf });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(editing);
  };

  const inputCls = "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Professors</h1>
          <p className="text-sm text-muted-foreground">Manage faculty members</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Add Professor
        </button>
      </div>

      {showForm && (
        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-foreground">{editing?.id ? "Edit" : "New"} Professor</h2>
            <button onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-5 w-5 text-muted-foreground" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <input required placeholder="Full Name" value={editing?.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={inputCls} />
              <input required placeholder="Title (e.g. Assoc. Prof. Dr.)" value={editing?.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className={inputCls} />
              <input required placeholder="Department" value={editing?.department || ""} onChange={(e) => setEditing({ ...editing, department: e.target.value })} className={inputCls} />
              <input placeholder="Photo URL" value={editing?.photo_url || ""} onChange={(e) => setEditing({ ...editing, photo_url: e.target.value })} className={inputCls} />
              <input type="number" placeholder="Display Order" value={editing?.display_order ?? 0} onChange={(e) => setEditing({ ...editing, display_order: e.target.value })} className={inputCls} />
            </div>
            <textarea placeholder="Bio" rows={3} value={editing?.bio || ""} onChange={(e) => setEditing({ ...editing, bio: e.target.value })} className={`w-full ${inputCls}`} />
            <button type="submit" disabled={saveMutation.isPending} className="rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {saveMutation.isPending ? "Saving..." : "Save Professor"}
            </button>
          </form>
        </div>
      )}

      <div className="mt-6 overflow-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Title</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Department</th>
              <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : professors.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No professors yet. Click "Add Professor" to get started.</td></tr>
            ) : professors.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.name} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">{p.name.charAt(0)}</div>
                    )}
                    <span className="font-medium text-foreground">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.department}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(p)} className="mr-2 text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => { if (confirm("Delete this professor?")) deleteMutation.mutate(p.id); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default AdminProfessors;
