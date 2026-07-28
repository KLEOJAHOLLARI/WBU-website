import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, Send, Mail, MessageSquare, Bell } from "lucide-react";

type Severity = "info" | "warning" | "critical";
type Role = "all" | "user" | "professor";

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: Severity;
  audience_role: Role;
  audience_program: string | null;
  channels: string[];
  delivery_stats: any;
  created_at: string;
}

const severityColor = (s: Severity) =>
  s === "critical" ? "bg-red-600 text-white" : s === "warning" ? "bg-amber-500 text-white" : "bg-sky-500 text-white";

export default function AdminEmergencyAlerts() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<Severity>("warning");
  const [audience, setAudience] = useState<Role>("all");
  const [program, setProgram] = useState<string>("");
  const [channels, setChannels] = useState<Record<string, boolean>>({ in_app: true, email: false, sms: false });
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<Alert[]>([]);
  const [programs, setPrograms] = useState<string[]>([]);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("emergency_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    setHistory((data as any) ?? []);
  };

  useEffect(() => {
    loadHistory();
    supabase.from("programs").select("slug,title").then(({ data }) => {
      setPrograms((data ?? []).map((p: any) => p.slug));
    });
  }, []);

  const send = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }
    const selectedChannels = Object.entries(channels).filter(([, v]) => v).map(([k]) => k);
    if (selectedChannels.length === 0) {
      toast.error("Select at least one delivery channel");
      return;
    }
    if (severity === "critical") {
      const ok = confirm("Send CRITICAL emergency alert to selected recipients?");
      if (!ok) return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-emergency-alert", {
      body: {
        title,
        message,
        severity,
        audience_role: audience,
        audience_program: program || null,
        channels: selectedChannels,
      },
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const stats = (data as any)?.stats;
    toast.success(`Alert sent — in-app: ${stats?.in_app ?? 0}, email: ${stats?.email ?? 0}, SMS: ${stats?.sms ?? 0}`);
    if (stats?.errors?.length) console.warn("Alert warnings:", stats.errors);
    setTitle("");
    setMessage("");
    loadHistory();
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-100 text-red-600"><AlertTriangle className="w-6 h-6" /></div>
          <div>
            <h1 className="text-2xl font-bold">Emergency Alerts</h1>
            <p className="text-sm text-muted-foreground">Broadcast urgent notices via in-app, email, and SMS.</p>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Broadcast a new alert</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Fire drill at Main Building" />
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Message</Label>
              <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Please evacuate calmly using the nearest exit..." />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Audience</Label>
                <Select value={audience} onValueChange={(v) => setAudience(v as Role)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Everyone (students + professors)</SelectItem>
                    <SelectItem value="user">Students only</SelectItem>
                    <SelectItem value="professor">Professors only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Program (optional)</Label>
                <Select value={program || "all"} onValueChange={(v) => setProgram(v === "all" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="All programs" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All programs</SelectItem>
                    {programs.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Delivery channels</Label>
              <div className="flex flex-wrap gap-4">
                {[
                  { key: "in_app", label: "In-app notification", icon: Bell },
                  { key: "email", label: "Email", icon: Mail },
                  { key: "sms", label: "SMS", icon: MessageSquare },
                ].map(({ key, label, icon: Icon }) => (
                  <label key={key} className="flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer hover:bg-muted">
                    <Checkbox checked={!!channels[key]} onCheckedChange={(v) => setChannels((c) => ({ ...c, [key]: !!v }))} />
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Email requires <code>RESEND_API_KEY</code>. SMS requires Twilio secrets (<code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code>, <code>TWILIO_FROM_NUMBER</code>). Channels without configured providers are skipped and reported.
              </p>
            </div>
            <Button onClick={send} disabled={sending} className="w-full md:w-auto">
              <Send className="w-4 h-4 mr-2" /> {sending ? "Sending..." : "Send alert"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent alerts</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {history.length === 0 && <p className="text-sm text-muted-foreground">No alerts sent yet.</p>}
            {history.map((a) => (
              <div key={a.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge className={severityColor(a.severity)}>{a.severity}</Badge>
                    <span className="font-semibold">{a.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{a.message}</p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Audience: {a.audience_role}{a.audience_program ? ` · ${a.audience_program}` : ""}</span>
                  <span>·</span>
                  <span>Channels: {a.channels.join(", ")}</span>
                  {a.delivery_stats && (
                    <>
                      <span>·</span>
                      <span>Delivered — in-app: {a.delivery_stats.in_app ?? 0}, email: {a.delivery_stats.email ?? 0}, SMS: {a.delivery_stats.sms ?? 0}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
