import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, RotateCcw } from "lucide-react";

interface SignatureConfig {
  enabled: boolean;
  admin_user_id: string | null;
  admin_name: string;
  title: string;
  label: string;
  signature_text: string;
  signature_font: "script" | "italic" | "bold";
  /** Font size in pt used when rendering the signature on PDFs. */
  signature_size: number;
  /** Horizontal offset in pt relative to the default right-aligned anchor. */
  signature_offset_x: number;
  /** Vertical offset in pt relative to the default baseline. */
  signature_offset_y: number;
  /** Legacy — kept for backwards-compat with older configs. */
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
  signature_size: 28,
  signature_offset_x: 0,
  signature_offset_y: 0,
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
        signature_size: form.signature_size,
        signature_offset_x: form.signature_offset_x,
        signature_offset_y: form.signature_offset_y,
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
  // Map pt (used by PDF) → px roughly (1pt ≈ 1.333px) for on-screen preview parity.
  const previewPx = Math.round(form.signature_size * 1.333);

  const resetPosition = () =>
    setForm((f) => ({ ...f, signature_offset_x: 0, signature_offset_y: 0, signature_size: 28 }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Transcript & Receipt Signature
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure the official admin signature shown on every downloaded transcript PDF and printed
          receipt. Size and position controls ensure it renders correctly on every device.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Include signature on documents</p>
            <p className="text-xs text-muted-foreground">When off, documents render without a signature block.</p>
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

        {/* Size & position controls */}
        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Size & position</p>
              <p className="text-xs text-muted-foreground">
                Values use PDF points (1 inch = 72 pt). Offsets are applied on top of the default
                layout on every generated document.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={resetPosition}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
            </Button>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Signature size</Label>
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                {form.signature_size} pt
              </span>
            </div>
            <Slider
              value={[form.signature_size]}
              min={10}
              max={60}
              step={1}
              onValueChange={([v]) => setForm((f) => ({ ...f, signature_size: v }))}
              className="mt-2"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="flex items-center justify-between">
                <Label>Horizontal offset (X)</Label>
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  {form.signature_offset_x > 0 ? "+" : ""}
                  {form.signature_offset_x} pt
                </span>
              </div>
              <Slider
                value={[form.signature_offset_x]}
                min={-60}
                max={60}
                step={1}
                onValueChange={([v]) => setForm((f) => ({ ...f, signature_offset_x: v }))}
                className="mt-2"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Negative = left, positive = right.
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Vertical offset (Y)</Label>
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  {form.signature_offset_y > 0 ? "+" : ""}
                  {form.signature_offset_y} pt
                </span>
              </div>
              <Slider
                value={[form.signature_offset_y]}
                min={-40}
                max={40}
                step={1}
                onValueChange={([v]) => setForm((f) => ({ ...f, signature_offset_y: v }))}
                className="mt-2"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Negative = up, positive = down.
              </p>
            </div>
          </div>
        </div>

        {/* Live preview frame */}
        <div>
          <Label className="mb-2 block">Live preview (approximates the PDF)</Label>
          <div className="relative h-48 overflow-hidden rounded-lg border border-dashed border-border bg-muted/20">
            {/* Simulated signature block (right-aligned, similar to PDF layout) */}
            <div className="absolute inset-0 p-6">
              <div className="absolute right-6 bottom-6 w-64 text-right">
                <div
                  className="inline-block whitespace-nowrap text-foreground transition-transform"
                  style={{
                    fontFamily: FONT_PREVIEW[form.signature_font],
                    fontStyle: form.signature_font === "italic" ? "italic" : "normal",
                    fontWeight: form.signature_font === "bold" ? 700 : 400,
                    fontSize: `${previewPx}px`,
                    lineHeight: 1,
                    transform: `translate(${form.signature_offset_x}px, ${form.signature_offset_y}px)`,
                  }}
                >
                  {previewText}
                </div>
                <div className="mt-2 border-t border-foreground/70 pt-1">
                  <p className="text-xs font-semibold text-foreground">
                    {form.admin_name || "Administrator name"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{form.title || "Title"}</p>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            The preview uses the same offsets and size that will be applied on generated PDFs and
            printed receipts.
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
