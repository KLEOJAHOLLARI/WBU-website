import { useEffect, useRef, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Save, Loader2, RotateCcw } from "lucide-react";
import { SITE_LOGO_KEY, SiteLogoValue } from "@/hooks/useSiteLogo";
import defaultLogo from "@/assets/wbu-logo.png";

const AdminLogo = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["site-logo-setting"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", SITE_LOGO_KEY)
        .maybeSingle();
      return (data?.value as SiteLogoValue) || { url: "" };
    },
  });

  useEffect(() => {
    if (data) setUrl(data.url || "");
  }, [data]);

  const save = useMutation({
    mutationFn: async (nextUrl: string | null) => {
      const payload: SiteLogoValue = { url: nextUrl };
      const { error } = await supabase
        .from("system_settings")
        .upsert({ key: SITE_LOGO_KEY, value: payload as any }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-logo-setting"] });
      qc.invalidateQueries({ queryKey: ["site-logo"] });
      toast({ title: "Logo saved" });
    },
    onError: (e: any) => toast({ title: e.message || "Failed to save", variant: "destructive" }),
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `site-logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("hero-media")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("hero-media").getPublicUrl(path);
      setUrl(urlData.publicUrl);
      toast({ title: "Uploaded — click Save to apply" });
    } catch (e: any) {
      toast({ title: e.message || "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const preview = url || defaultLogo;

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold text-foreground">Site Logo</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload a custom logo used across the navbar, footer, and mobile views. Leave empty to use the default WBU wordmark.
      </p>

      <div className="mt-6 max-w-3xl space-y-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <label className="mb-2 block text-sm font-medium text-foreground">Logo URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://... or upload below"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Tip: use a transparent PNG or SVG. It will be shown inverted (white) on dark backgrounds.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Uploading..." : "Upload image"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
            <button
              onClick={() => save.mutate(url || null)}
              disabled={save.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {save.isPending ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => { setUrl(""); save.mutate(null); }}
              disabled={save.isPending}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted disabled:opacity-60"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to default
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Light preview</p>
            <div className="flex h-24 items-center justify-center rounded-lg bg-background">
              <img src={preview} alt="Logo preview light" className="h-10 w-auto" />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dark preview (inverted)</p>
            <div className="flex h-24 items-center justify-center rounded-lg bg-primary">
              <img src={preview} alt="Logo preview dark" className="h-10 w-auto brightness-0 invert" />
            </div>
          </div>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
      </div>
    </AdminLayout>
  );
};

export default AdminLogo;
