import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, Trash2, ShieldCheck } from "lucide-react";

interface SignatureConfig {
  enabled: boolean;
  admin_user_id: string | null;
  admin_name: string;
  title: string;
  label: string;
  signature_path: string | null;
}

const DEFAULTS: SignatureConfig = {
  enabled: false,
  admin_user_id: null,
  admin_name: "",
  title: "Registrar",
  label: "Verified by Administration",
  signature_path: null,
};

const TranscriptSignatureSettings = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<SignatureConfig>(DEFAULTS);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Load existing config
  const { data: settingRow, isLoading } = useQuery({
    queryKey: ["transcript-signature-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "transcript_signature")
        .maybeSingle();
      return (data?.value as SignatureConfig | null) ?? null;
    },
  });

  // Load admins to pick the signing admin from
  const { data: admins = [] } = useQuery({
    queryKey: ["admin-list-for-signature"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", ids)
        .order("full_name");
      return profiles ?? [];
    },
  });

  // Hydrate form from server when loaded
  useEffect(() => {
    if (settingRow) setForm({ ...DEFAULTS, ...settingRow });
  }, [settingRow]);

  // Refresh signed preview whenever the saved path changes
  useEffect(() => {
    let cancelled = false;
    const path = form.signature_path;
    if (!path) { setPreviewUrl(null); return; }
    (async () => {
      const { data } = await supabase
        .storage
        .from("transcript-signatures")
        .createSignedUrl(path, 300);
      if (!cancelled) setPreviewUrl(data?.signedUrl ?? null);
    })();
    return () => { cancelled = true; };
  }, [form.signature_path]);

  const adminOptions = useMemo(
    () => admins.map((a) => ({ value: a.user_id, label: a.full_name || a.email || a.user_id })),
    [admins]
  );

  const onPickAdmin = (userId: string) => {
    const admin = admins.find((a) => a.user_id === userId);
    setForm((f) => ({
      ...f,
      admin_user_id: userId,
      admin_name: admin?.full_name || f.admin_name || admin?.email || "",
    }));
  };

  const handleUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please choose an image file", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image must be smaller than 2MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      // Delete previous file (best-effort)
      if (form.signature_path) {
        await supabase.storage.from("transcript-signatures").remove([form.signature_path]);
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `signature-${Date.now()}.${ext}`;
      const { error } = await supabase
        .storage
        .from("transcript-signatures")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      setForm((f) => ({ ...f, signature_path: path }));
      toast({ title: "Signature uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveSignature = async () => {
    if (!form.signature_path) return;
    try {
      await supabase.storage.from("transcript-signatures").remove([form.signature_path]);
    } catch { /* ignore */ }
    setForm((f) => ({ ...f, signature_path: null }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const value = {
        enabled: form.enabled,
        admin_user_id: form.admin_user_id,
        admin_name: form.admin_name,
        title: form.title,
        label: form.label,
        signature_path: form.signature_path,
      };
      // Upsert by key
      const { data: existing } = await supabase
        .from("system_settings").select("id").eq("key", "transcript_signature").maybeSingle();
      if (existing?.id) {
        const { error } = await supabase
          .from("system_settings")
          .update({ value, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("system_settings")
          .insert({ key: "transcript_signature", value });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Settings saved" });
      queryClient.invalidateQueries({ queryKey: ["transcript-signature-settings"] });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Transcript Signature & Verification
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure the official admin signature shown on every downloaded transcript PDF.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Include signature on transcripts</p>
            <p className="text-xs text-muted-foreground">When off, transcripts download without a signature block.</p>
          </div>
          <Switch
            checked={form.enabled}
            onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Signing administrator</Label>
            <Select value={form.admin_user_id ?? ""} onValueChange={onPickAdmin}>
              <SelectTrigger><SelectValue placeholder="Select admin" /></SelectTrigger>
              <SelectContent>
                {adminOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Display name (printed on PDF)</Label>
            <Input
              value={form.admin_name}
              onChange={(e) => setForm((f) => ({ ...f, admin_name: e.target.value }))}
              placeholder="e.g. Dr. Jane Doe"
            />
          </div>

          <div>
            <Label>Title / Position</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Registrar"
            />
          </div>

          <div>
            <Label>Verification label</Label>
            <Input
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="Verified by Administration"
            />
          </div>
        </div>

        {/* Signature upload */}
        <div>
          <Label className="mb-2 block">Signature image</Label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-24 w-56 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 overflow-hidden">
              {previewUrl ? (
                <img src={previewUrl} alt="Signature preview" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-xs text-muted-foreground">No signature uploaded</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Uploading…" : form.signature_path ? "Replace" : "Upload"}
              </Button>
              {form.signature_path && (
                <Button type="button" variant="ghost" size="sm" onClick={handleRemoveSignature}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            PNG with transparent background recommended. Max 2MB.
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TranscriptSignatureSettings;
