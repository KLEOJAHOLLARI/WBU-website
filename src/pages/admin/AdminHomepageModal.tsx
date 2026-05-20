import { useEffect, useRef, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Upload, Loader2, Eye, EyeOff, Megaphone, Info, AlertTriangle } from "lucide-react";

type Variant = "info" | "important" | "warning";
type Announcement = {
  active: boolean;
  variant: Variant;
  title: string;
  body: string;
  image_url?: string;
  cta_label?: string;
  cta_url?: string;
  updated_at?: string;
};

const empty: Announcement = {
  active: false,
  variant: "important",
  title: "",
  body: "",
  image_url: "",
  cta_label: "",
  cta_url: "",
};

const AdminHomepageModal = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Announcement>(empty);
  const [uploading, setUploading] = useState(false);

  const { data } = useQuery({
    queryKey: ["homepage-announcement-admin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "homepage_announcement")
        .maybeSingle();
      return (data?.value as Announcement) || empty;
    },
  });

  useEffect(() => {
    if (data) setForm({ ...empty, ...data });
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: Announcement = { ...form, updated_at: new Date().toISOString() };
      const { error } = await supabase
        .from("system_settings")
        .upsert({ key: "homepage_announcement", value: payload as any }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["homepage-announcement-admin"] });
      qc.invalidateQueries({ queryKey: ["homepage-announcement"] });
      toast({ title: "Announcement saved" });
    },
    onError: (e: any) => toast({ title: e.message || "Failed to save", variant: "destructive" }),
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `announcement-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("promo-banners").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("promo-banners").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: urlData.publicUrl }));
      toast({ title: "Image uploaded — remember to save" });
    } catch (e: any) {
      toast({ title: e.message || "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const variants: { value: Variant; label: string; Icon: any }[] = [
    { value: "info", label: "Info", Icon: Info },
    { value: "important", label: "Important", Icon: Megaphone },
    { value: "warning", label: "Warning", Icon: AlertTriangle },
  ];

  return (
    <AdminLayout>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Homepage Announcement Modal</h1>
          <p className="mt-1 text-sm text-muted-foreground">Show an important pop-up to all visitors landing on the homepage.</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${form.active ? "bg-green-500/10 text-green-700" : "bg-muted text-muted-foreground"}`}>
          {form.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {form.active ? "Live" : "Hidden"}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5 rounded-xl border border-border bg-card p-6">
          <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Show modal on homepage</p>
              <p className="text-xs text-muted-foreground">Visitors see it once until they dismiss; editing re-shows it.</p>
            </div>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-muted-foreground/30 transition-all checked:bg-primary relative before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-all checked:before:left-[18px]"
            />
          </label>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Style</label>
            <div className="flex flex-wrap gap-2">
              {variants.map((v) => (
                <button
                  key={v.value}
                  onClick={() => setForm({ ...form, variant: v.value })}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${form.variant === v.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                >
                  <v.Icon className="h-4 w-4" /> {v.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Important: Registration deadline extended"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Body</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={5}
              placeholder="Write the announcement details here..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Button label (optional)</label>
              <input
                value={form.cta_label || ""}
                onChange={(e) => setForm({ ...form, cta_label: e.target.value })}
                placeholder="Apply now"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Button URL (optional)</label>
              <input
                value={form.cta_url || ""}
                onChange={(e) => setForm({ ...form, cta_url: e.target.value })}
                placeholder="/admissions or https://..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Image (optional)</label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={form.image_url || ""}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://... or upload"
                className="flex-1 min-w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading..." : "Upload"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>
          </div>

          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !form.title}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> {save.isPending ? "Saving..." : "Save announcement"}
          </button>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Live preview</p>
          <div className="overflow-hidden rounded-lg border border-border bg-background">
            {form.image_url && (
              <div className="aspect-[16/8] w-full overflow-hidden bg-muted">
                <img src={form.image_url} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="p-5">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent">
                <Megaphone className="h-3 w-3" />
                {form.variant === "warning" ? "Important Notice" : form.variant === "info" ? "Announcement" : "Important"}
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">{form.title || "Your title here"}</h3>
              <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{form.body || "Your message goes here…"}</p>
              {form.cta_label && (
                <button className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
                  {form.cta_label}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminHomepageModal;
