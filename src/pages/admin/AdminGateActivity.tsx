import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, AlertTriangle, Activity, Radio, Volume2, VolumeX } from "lucide-react";

type Log = {
  id: string;
  user_id: string;
  role: string;
  card_type: string;
  action: string;
  status: string;
  gate_name: string;
  scanned_at: string;
  notes: string | null;
};

type Profile = { user_id: string; full_name: string; student_id: string | null; program: string | null; avatar_url: string | null };

const beep = (freq = 880, ms = 90) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, ms);
  } catch {}
};

export default function AdminGateActivity() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [connected, setConnected] = useState(false);
  const [sound, setSound] = useState(true);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const soundRef = useRef(sound);
  soundRef.current = sound;

  // Initial fetch (last 50)
  const { data: initial = [] } = useQuery({
    queryKey: ["gate-activity-initial"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_logs")
        .select("*")
        .order("scanned_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Log[];
    },
  });

  useEffect(() => { if (initial.length) setLogs(initial); }, [initial]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("gate-activity")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "access_logs" }, (payload) => {
        const row = payload.new as Log;
        setLogs(prev => [row, ...prev].slice(0, 80));
        setPulseId(row.id);
        setTimeout(() => setPulseId(p => (p === row.id ? null : p)), 1500);
        if (soundRef.current) beep(row.status === "success" ? 880 : 320, row.status === "success" ? 90 : 220);
      })
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => { supabase.removeChannel(channel); };
  }, []);

  const userIds = useMemo(() => Array.from(new Set(logs.map(l => l.user_id))), [logs]);
  const { data: profiles = [] } = useQuery({
    queryKey: ["gate-profiles", userIds.join(",")],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, student_id, program, avatar_url")
        .in("user_id", userIds);
      return (data || []) as Profile[];
    },
  });
  const pmap = useMemo(() => new Map(profiles.map(p => [p.user_id, p])), [profiles]);

  const todayPrefix = new Date().toISOString().slice(0, 10);
  const todays = logs.filter(l => l.scanned_at.startsWith(todayPrefix));
  const insideNow = useMemo(() => {
    const latest = new Map<string, string>();
    [...logs].reverse().forEach(l => { if (l.status === "success") latest.set(l.user_id, l.action); });
    return Array.from(latest.values()).filter(a => a === "check_in").length;
  }, [logs]);

  const denied = logs.filter(l => l.status !== "success").slice(0, 8);
  const success = logs.filter(l => l.status === "success");
  const latest = success[0];
  const latestProfile = latest ? pmap.get(latest.user_id) : undefined;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" /> Gate Activity
            </h1>
            <p className="text-sm text-muted-foreground">Live feed of card scans across all gates.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`gap-1.5 ${connected ? "text-emerald-600 border-emerald-500/30" : "text-muted-foreground"}`}>
              <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
              {connected ? "Live" : "Connecting…"}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setSound(s => !s)}>
              {sound ? <Volume2 className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2" />}
              {sound ? "Sound on" : "Muted"}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Latest scan – hero card */}
          <Card className="lg:col-span-2 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Radio className="h-4 w-4" /> Latest successful scan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {latest ? (
                <div className={`rounded-xl border p-6 transition-colors ${latest.action === "check_in" ? "bg-emerald-500/5 border-emerald-500/30" : "bg-red-500/5 border-red-500/30"}`}>
                  <div className="flex items-center gap-5">
                    <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${latest.action === "check_in" ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-600"}`}>
                      {latest.action === "check_in" ? <LogIn className="h-7 w-7" /> : <LogOut className="h-7 w-7" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">{latest.action === "check_in" ? "Checked in" : "Checked out"}</p>
                      <p className="text-2xl font-semibold truncate">{latestProfile?.full_name || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">
                        {latestProfile?.student_id || "—"} · {latestProfile?.program || latest.role} · {latest.gate_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-mono font-semibold">{new Date(latest.scanned_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
                      <Badge variant="outline" className="capitalize mt-1">{latest.card_type}</Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground text-sm">Waiting for the next scan…</div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="space-y-4">
            <Card><CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Inside Campus Now</p>
              <p className="text-4xl font-semibold mt-1">{insideNow}</p>
            </CardContent></Card>
            <div className="grid grid-cols-2 gap-4">
              <Card><CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Check-ins today</p>
                <p className="text-2xl font-semibold text-emerald-600 mt-1">{todays.filter(l => l.action === "check_in" && l.status === "success").length}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Check-outs today</p>
                <p className="text-2xl font-semibold text-red-600 mt-1">{todays.filter(l => l.action === "check_out" && l.status === "success").length}</p>
              </CardContent></Card>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Live feed */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Live feed</CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[520px] overflow-auto">
              {logs.length === 0 && <p className="text-sm text-muted-foreground py-10 text-center">No scans yet today.</p>}
              <ul className="divide-y divide-border">
                {logs.map(l => {
                  const p = pmap.get(l.user_id);
                  const isIn = l.action === "check_in";
                  const isFail = l.status !== "success";
                  return (
                    <li
                      key={l.id}
                      className={`flex items-center gap-3 px-5 py-3 transition-colors ${pulseId === l.id ? "bg-primary/5" : ""}`}
                    >
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isFail ? "bg-amber-500/10 text-amber-600"
                        : isIn ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-red-500/10 text-red-600"
                      }`}>
                        {isFail ? <AlertTriangle className="h-4 w-4" /> : isIn ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p?.full_name || <span className="italic text-muted-foreground">Unknown card</span>}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {p?.student_id || "—"} · {l.gate_name} · <span className="capitalize">{l.card_type}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-mono">{new Date(l.scanned_at).toLocaleTimeString()}</p>
                        <Badge variant="outline" className={`capitalize text-[10px] mt-0.5 ${
                          l.status === "success" ? "border-emerald-500/30 text-emerald-700"
                          : l.status === "expired" ? "border-amber-500/30 text-amber-700"
                          : l.status === "inactive" ? "border-zinc-500/30 text-zinc-700"
                          : "border-red-500/30 text-red-700"
                        }`}>{l.status}</Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          {/* Denied / problems */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" /> Recent issues
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {denied.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No denied or expired scans.</p>}
              {denied.map(l => {
                const p = pmap.get(l.user_id);
                return (
                  <div key={l.id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{p?.full_name || "Unknown card"}</p>
                      <Badge variant="outline" className="capitalize text-[10px] border-amber-500/30 text-amber-700">{l.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {l.gate_name} · {new Date(l.scanned_at).toLocaleTimeString()}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
