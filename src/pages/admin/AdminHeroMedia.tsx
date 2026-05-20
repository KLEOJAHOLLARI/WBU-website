import { useEffect, useRef, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Image as ImageIcon, Film, Save, Loader2 } from "lucide-react";

type HeroMedia = { type: "image" | "video"; url: string };

const AdminHeroMedia = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<"image" | "video">("image");
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["hero-media-setting"],
    queryFn: async () => {
      const { data } = await supabase.from("system_settings").select("value").eq("key", "hero_media").maybeSingle();
      return (data?.value as HeroMedia) || { type: "image", url: "" };
    },
  });

  useEffect(() => {
    if (data) {
      setType((data.type as "image" | "video") || "image");
      setUrl(data.url || "");
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: HeroMedia = { type, url };
      const { error } = await supabase
        .from("system_settings")
        .upsert({ key: "hero_media", value: payload as any }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hero-media-setting"] });
      qc.invalidateQueries({ queryKey: ["hero-media-public"] });
      toast({ title: "Hero media saved" });
    },
    onError: (e: any) => toast({ title: e.message || "Failed to save", variant: "destructive" }),
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      toast({ title: "Please select an image or video file", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `hero-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("hero-media").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("hero-media").getPublicUrl(path);
      setUrl(urlData.publicUrl);
      setType(isVideo ? "video" : "image");
      toast({ title: "Uploaded — click Save to apply" });
    } catch (e: any) {
      toast({ title: e.message || "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold text-foreground">Homepage Hero Media</h1>
      <p className="mt-1 text-sm text-muted-foreground">Upload an image or video shown as the homepage hero background.</p>

      <div className="mt-6 max-w-3xl space-y-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setType("image")}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${type === "image" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
            >
              <ImageIcon className="h-4 w-4" /> Image
            </button>
            <button
              onClick={() => setType("video")}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${type === "video" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
            >
              <Film className="h-4 w-4" /> Video
            </button>
          </div>

          <label className="mb-2 block text-sm font-medium text-foreground">Media URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://... or upload below"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Uploading..." : "Upload file"}
            </button>
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending || !url}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {save.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {url && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
            <div className="overflow-hidden rounded-lg bg-black aspect-video">
              {type === "video" ? (
                <video src={url} className="h-full w-full object-cover" controls muted />
              ) : (
                <img src={url} alt="Hero preview" className="h-full w-full object-cover" />
              )}
            </div>
          </div>
        )}

        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
      </div>
    </AdminLayout>
  );
};

export default AdminHeroMedia;
