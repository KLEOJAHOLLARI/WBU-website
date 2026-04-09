import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Megaphone } from "lucide-react";

const AdminAnnouncements = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["all-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name, code").order("name");
      return data || [];
    },
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["all-programs"],
    queryFn: async () => {
      const { data } = await supabase.from("programs").select("slug, title").order("title");
      return data || [];
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["admin-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (form: any) => {
      const payload = {
        title: form.title,
        body: form.body,
        course_id: form.course_id || null,
        program: form.program || null,
        author_id: user!.id,
        author_name: profile?.full_name || user!.email || "Admin",
      };
      if (form.id) {
        const { error } = await supabase.from("announcements").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("announcements").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-announcements"] });
      setShowForm(false);
      setEditing(null);
      toast({ title: "Announcement saved!" });
    },
    onError: () => toast({ title: "Error saving announcement", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-announcements"] });
      toast({ title: "Announcement deleted" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(editing);
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Announcements</h1>
          <p className="text-sm text-muted-foreground">Post announcements to courses or programs</p>
        </div>
        <button onClick={() => { setEditing({ title: "", body: "", course_id: "", program: "" }); setShowForm(true); }} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> New Announcement
        </button>
      </div>

      {showForm && (
        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-foreground">{editing?.id ? "Edit" : "New"} Announcement</h2>
            <button onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-5 w-5 text-muted-foreground" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input required placeholder="Title" value={editing?.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <textarea required placeholder="Announcement body" rows={4} value={editing?.body || ""} onChange={(e) => setEditing({ ...editing, body: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <div className="grid gap-4 sm:grid-cols-2">
              <select value={editing?.course_id || ""} onChange={(e) => setEditing({ ...editing, course_id: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">No specific course</option>
                {courses.map((c: any) => <option key={c.id} value={c.id}>{c.code} – {c.name}</option>)}
              </select>
              <select value={editing?.program || ""} onChange={(e) => setEditing({ ...editing, program: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">No specific program</option>
                {programs.map((p: any) => <option key={p.slug} value={p.slug}>{p.title}</option>)}
              </select>
            </div>
            <button type="submit" disabled={saveMutation.isPending} className="rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {saveMutation.isPending ? "Saving..." : "Save"}
            </button>
          </form>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : announcements.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">No announcements yet.</div>
        ) : announcements.map((a: any) => (
          <div key={a.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h3 className="font-display font-semibold text-foreground">{a.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">{a.body}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>By {a.author_name}</span>
                    <span>·</span>
                    <span>{new Date(a.created_at).toLocaleString()}</span>
                    {a.program && <><span>·</span><span>Program: {a.program}</span></>}
                    {a.course_id && <><span>·</span><span>Course linked</span></>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditing(a); setShowForm(true); }} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(a.id); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminAnnouncements;
