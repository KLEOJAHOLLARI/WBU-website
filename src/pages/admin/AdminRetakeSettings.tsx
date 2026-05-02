import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, XCircle, Save, ShieldCheck } from "lucide-react";

type Settings = {
  enabled: boolean;
  max_attempts: number;
  fee_amount: number;
  fee_currency: string;
};

const AdminRetakeSettings = () => {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: settings } = useQuery<Settings>({
    queryKey: ["retake-settings-admin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "retake_settings")
        .maybeSingle();
      const v = (data?.value as any) || {};
      return {
        enabled: v.enabled ?? true,
        max_attempts: Number(v.max_attempts ?? 3),
        fee_amount: Number(v.fee_amount ?? 0),
        fee_currency: String(v.fee_currency ?? "EUR"),
      };
    },
  });

  const [form, setForm] = useState<Settings | null>(null);
  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  const saveMutation = useMutation({
    mutationFn: async (s: Settings) => {
      const { error } = await supabase
        .from("system_settings")
        .upsert({ key: "retake_settings", value: s as any }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Settings saved" });
      qc.invalidateQueries({ queryKey: ["retake-settings"] });
      qc.invalidateQueries({ queryKey: ["retake-settings-admin"] });
    },
    onError: (e: any) =>
      toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  // All retake requests (admin override view)
  const { data: requests = [] } = useQuery({
    queryKey: ["admin-all-retake-requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("course_retake_requests")
        .select(
          "id, status, attempt_number, previous_grade, previous_albanian, advisor_comment, created_at, course_id, user_id, courses:course_id(name, code, program), profiles:user_id(full_name, email, student_id)"
        )
        .order("created_at", { ascending: false })
        .limit(100);
      return data as any[];
    },
  });

  const overrideMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase
        .from("course_retake_requests")
        .update({
          status,
          advisor_comment: "Decision overridden by administration",
          reviewed_at: new Date().toISOString(),
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Decision overridden" });
      qc.invalidateQueries({ queryKey: ["admin-all-retake-requests"] });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (!form) {
    return (
      <AdminLayout>
        <p className="text-muted-foreground">Loading…</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center gap-3">
        <RefreshCw className="h-6 w-6 text-orange-500" />
        <h1 className="font-display text-2xl font-bold text-foreground">Retake Settings</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Configure the failed-course retake system and override advisor decisions when needed.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">System Configuration</CardTitle>
          <CardDescription>
            Enable or disable the retake system and set limits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label className="text-sm font-medium">Retake system enabled</Label>
              <p className="text-xs text-muted-foreground">
                When off, students cannot submit new retake requests.
              </p>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => setForm({ ...form, enabled: v })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Max attempts per course</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={form.max_attempts}
                onChange={(e) =>
                  setForm({ ...form, max_attempts: Number(e.target.value) || 1 })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Retake fee (per course)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.fee_amount}
                onChange={(e) =>
                  setForm({ ...form, fee_amount: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Currency</Label>
              <Input
                value={form.fee_currency}
                onChange={(e) =>
                  setForm({ ...form, fee_currency: e.target.value.toUpperCase().slice(0, 3) })
                }
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              <Save className="mr-1.5 h-4 w-4" />
              {saveMutation.isPending ? "Saving…" : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            All Retake Requests (Admin Override)
          </CardTitle>
          <CardDescription>Latest 100 requests across all programs.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Student</th>
                  <th className="px-4 py-2.5 text-left font-medium">Course</th>
                  <th className="px-4 py-2.5 text-left font-medium">Attempt</th>
                  <th className="px-4 py-2.5 text-left font-medium">Prev grade</th>
                  <th className="px-4 py-2.5 text-left font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Override</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No retake requests yet.
                    </td>
                  </tr>
                ) : (
                  requests.map((r: any) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2">
                        <p className="font-medium text-foreground">{r.profiles?.full_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{r.profiles?.email}</p>
                      </td>
                      <td className="px-4 py-2">
                        <p className="text-foreground">{r.courses?.name}</p>
                        <p className="text-xs text-muted-foreground">{r.courses?.code} · {r.courses?.program}</p>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">#{r.attempt_number}</td>
                      <td className="px-4 py-2">
                        <span className="font-semibold text-destructive">
                          {r.previous_albanian ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant="secondary">{r.status}</Badge>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => overrideMutation.mutate({ id: r.id, status: "approved" })}
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-emerald-600 hover:bg-emerald-500/10"
                            title="Force approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => overrideMutation.mutate({ id: r.id, status: "rejected" })}
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                            title="Force reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminRetakeSettings;
