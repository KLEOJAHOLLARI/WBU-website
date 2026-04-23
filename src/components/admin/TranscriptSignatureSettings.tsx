import { useEffect, useMemo, useState } from "react";
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
import { ShieldCheck } from "lucide-react";

interface SignatureConfig {
  enabled: boolean;
  admin_user_id: string | null;
  admin_name: string;
  title: string;
  label: string;
  /** Text used to render the stylised signature on the PDF. Falls back to admin_name. */
  signature_text: string;
  /** Font style used to render the signature text. */
  signature_font: "script" | "italic" | "bold";
  /** Legacy field kept for backwards-compat with prior uploads. Always null in new flow. */
  signature_path: string | null;
}

const DEFAULTS: SignatureConfig = {
  enabled: false,
  admin_user_id: null,
  admin_name: "",
  title: "Registrar",
  label: "Verified by Administration",
  signature_text: "",
  signature_font: "script",
  signature_path: null,
};

const FONT_PREVIEW: Record<SignatureConfig["signature_font"], string> = {
  script: "'Brush Script MT', 'Lucida Handwriting', cursive",
  italic: "'Times New Roman', serif",
  bold: "'Helvetica', sans-serif",
};

const TranscriptSignatureSettings = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SignatureConfig>(DEFAULTS);

  const { data: settingRow, isLoading } = useQuery({
    queryKey: ["transcript-signature-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "transcript_signature")
        .maybeSingle();
      return (data?.value as unknown as SignatureConfig | null) ?? null;
    },
  });

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

  useEffect(() => {
    if (settingRow) setForm({ ...DEFAULTS, ...settingRow });
  }, [settingRow]);

  const adminOptions = useMemo(
    () => admins.map((a) => ({ value: a.user_id, label: a.full_name || a.email || a.user_id })),
    [admins]
  );

  const onPickAdmin = (userId: string) => {
    const admin = admins.find((a) => a.user_id === userId);
    const name = admin?.full_name || admin?.email || "";
    setForm((f) => ({
      ...f,
      admin_user_id: userId,
      admin_name: name || f.admin_name,
      signature_text: f.signature_text || name,
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const value = {
        enabled: form.enabled,
        admin_user_id: form.admin_user_id,
        admin_name: form.admin_name,
        title: form.title,
        label: form.label,
        signature_text: form.signature_text || form.admin_name,
        signature_font: form.signature_font,
        signature_path: null,
      };
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

  const previewText = form.signature_text || form.admin_name || "Your signature";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Transcript Signature & Verification
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure the official admin signature shown on every downloaded transcript PDF. The
          signature is rendered as styled text — no image upload required.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
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

          <div>
            <Label>Signature text</Label>
            <Input
              value={form.signature_text}
              onChange={(e) => setForm((f) => ({ ...f, signature_text: e.target.value }))}
              placeholder="Defaults to display name"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Leave blank to use the display name.
            </p>
          </div>

          <div>
            <Label>Signature style</Label>
            <Select
              value={form.signature_font}
              onValueChange={(v: SignatureConfig["signature_font"]) =>
                setForm((f) => ({ ...f, signature_font: v }))
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="script">Handwritten (script)</SelectItem>
                <SelectItem value="italic">Italic serif</SelectItem>
                <SelectItem value="bold">Bold sans-serif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Signature preview</Label>
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-6">
            <span
              className="truncate text-3xl text-foreground"
              style={{
                fontFamily: FONT_PREVIEW[form.signature_font],
                fontStyle: form.signature_font === "italic" ? "italic" : "normal",
                fontWeight: form.signature_font === "bold" ? 700 : 400,
              }}
            >
              {previewText}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            This is exactly how the signature will appear on the transcript PDF.
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
