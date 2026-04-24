import { useState, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, ArrowUp, ArrowDown, Eye, EyeOff, Upload, Loader2 } from "lucide-react";

const empty = {
  title: "",
  description: "",
  button_text: "Learn More",
  button_link: "/admissions",
  image_url: "",
  sort_order: 0,
  is_active: true,
};

const AdminPromoBanners = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("promo-banners").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("promo-banners").getPublicUrl(path);
      setEditing((prev: any) => ({ ...prev, image_url: data.publicUrl }));
      toast({ title: "Image uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["admin-promo-banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promo_banners")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (form: any) => {
      const payload = {
        title: form.title,
        description: form.description || "",
        button_text: form.button_text || "Learn More",
        button_link: form.button_link || "/",
        image_url: form.image_url || "",
        sort_order: Number(form.sort_order) || 0,
        is_active: !!form.is_active,
      };
      if (form.id) {
        const { error } = await supabase.from("promo_banners").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("promo_banners").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-promo-banners"] });
      qc.invalidateQueries({ queryKey: ["promo-banners-active"] });
      setShowForm(false);
      setEditing(null);
      toast({ title: "Banner saved!" });
    },
    onError: (e: any) =>
      toast({ title: "Error saving banner", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promo_banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-promo-banners"] });
      qc.invalidateQueries({ queryKey: ["promo-banners-active"] });
      toast({ title: "Banner deleted" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (b: any) => {
      const { error } = await supabase
        .from("promo_banners")
        .update({ is_active: !b.is_active })
        .eq("id", b.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-promo-banners"] });
      qc.invalidateQueries({ queryKey: ["promo-banners-active"] });
    },
  });

  const moveSort = useMutation({
    mutationFn: async ({ b, dir }: { b: any; dir: -1 | 1 }) => {
      const { error } = await supabase
        .from("promo_banners")
        .update({ sort_order: (b.sort_order || 0) + dir })
        .eq("id", b.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-promo-banners"] });
      qc.invalidateQueries({ queryKey: ["promo-banners-active"] });
    },
  });

  const openEdit = (b: any) => {
    setEditing({ ...b });
    setShowForm(true);
  };
  const openNew = () => {
    setEditing({ ...empty, sort_order: (banners[banners.length - 1]?.sort_order ?? 0) + 1 });
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
          <h1 className="font-display text-2xl font-bold text-foreground">Promo Banners</h1>
          <p className="text-sm text-muted-foreground">
            Manage homepage promotional sections (scholarships, programs, etc.)
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Add Banner
        </button>
      </div>

      {showForm && (
        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-foreground">
              {editing?.id ? "Edit" : "New"} Banner
            </h2>
            <button onClick={() => { setShowForm(false); setEditing(null); }}>
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              required
              placeholder="Title"
              value={editing?.title || ""}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <textarea
              placeholder="Description"
              rows={3}
              value={editing?.description || ""}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                placeholder="Button text (e.g. Learn More)"
                value={editing?.button_text || ""}
                onChange={(e) => setEditing({ ...editing, button_text: e.target.value })}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                placeholder="Button link (e.g. /admissions or https://...)"
                value={editing?.button_link || ""}
                onChange={(e) => setEditing({ ...editing, button_link: e.target.value })}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Background image</label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload(f);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? "Uploading..." : editing?.image_url ? "Replace image" : "Upload image"}
                </button>
                {editing?.image_url && (
                  <button
                    type="button"
                    onClick={() => setEditing({ ...editing, image_url: "" })}
                    className="text-xs text-muted-foreground underline hover:text-destructive"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                placeholder="Or paste an image URL"
                value={editing?.image_url || ""}
                onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {editing?.image_url && (
                <img
                  src={editing.image_url}
                  alt="preview"
                  className="h-32 w-full rounded-md border border-border object-cover"
                />
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="number"
                placeholder="Sort order"
                value={editing?.sort_order ?? 0}
                onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={!!editing?.is_active}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                Active (show on homepage)
              </label>
            </div>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saveMutation.isPending ? "Saving..." : "Save Banner"}
            </button>
          </form>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <p className="py-8 text-center text-muted-foreground">Loading...</p>
        ) : banners.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No banners yet. Add one to get started.</p>
        ) : (
          banners.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-3 sm:p-4"
            >
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                {b.image_url && (
                  <img src={b.image_url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-medium text-foreground">{b.title}</h3>
                  {!b.is_active && (
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                      Hidden
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  #{b.sort_order} · {b.button_text} → {b.button_link}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveSort.mutate({ b, dir: -1 })}
                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Move up"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => moveSort.mutate({ b, dir: 1 })}
                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => toggleActive.mutate(b)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title={b.is_active ? "Hide" : "Show"}
                >
                  {b.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => openEdit(b)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm("Delete this banner?")) deleteMutation.mutate(b.id);
                  }}
                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPromoBanners;
