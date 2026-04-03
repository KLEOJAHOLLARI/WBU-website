import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X } from "lucide-react";

const emptyArticle = { slug: "", title: "", excerpt: "", content: "", category: "News", image_url: "" };

const AdminNews = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["admin-news"],
    queryFn: async () => {
      const { data, error } = await supabase.from("news_articles").select("*").order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (form: any) => {
      const payload = {
        slug: form.slug,
        title: form.title,
        excerpt: form.excerpt,
        content: form.content,
        category: form.category,
        image_url: form.image_url || null,
      };
      if (form.id) {
        const { error } = await supabase.from("news_articles").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("news_articles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-news"] });
      setShowForm(false);
      setEditing(null);
      toast({ title: "Article saved!" });
    },
    onError: () => toast({ title: "Error saving article", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("news_articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-news"] });
      toast({ title: "Article deleted" });
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
          <h1 className="font-display text-2xl font-bold text-foreground">News & Events</h1>
          <p className="text-sm text-muted-foreground">Manage news articles and events</p>
        </div>
        <button onClick={() => { setEditing({ ...emptyArticle }); setShowForm(true); }} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Add Article</button>
      </div>

      {showForm && (
        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-foreground">{editing?.id ? "Edit" : "New"} Article</h2>
            <button onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-5 w-5 text-muted-foreground" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <input required placeholder="Title" value={editing?.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <input required placeholder="Slug" value={editing?.slug || ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <select value={editing?.category || "News"} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option>News</option><option>Event</option><option>Announcement</option>
              </select>
              <input placeholder="Image URL" value={editing?.image_url || ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <textarea required placeholder="Excerpt" rows={2} value={editing?.excerpt || ""} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <textarea required placeholder="Full content" rows={6} value={editing?.content || ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <button type="submit" disabled={saveMutation.isPending} className="rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {saveMutation.isPending ? "Saving..." : "Save Article"}
            </button>
          </form>
        </div>
      )}

      <div className="mt-6 overflow-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-foreground">Title</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Category</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Date</th>
              <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : articles.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">{a.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.category}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(a.published_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { setEditing(a); setShowForm(true); }} className="mr-2 text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => { if (confirm("Delete this article?")) deleteMutation.mutate(a.id); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default AdminNews;
