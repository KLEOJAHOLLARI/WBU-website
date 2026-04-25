import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogIn, LogOut, Users, AlertTriangle, Download, Search, RefreshCw } from "lucide-react";

type LogRow = {
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

type Profile = { user_id: string; full_name: string; student_id: string | null; program: string | null };

const statusColor: Record<string, string> = {
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  denied: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  expired: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  inactive: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/30",
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function AdminAccessLogs() {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [role, setRole] = useState<string>("all");
  const [action, setAction] = useState<string>("all");
  const [cardType, setCardType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const { data: logs = [], refetch, isFetching } = useQuery({
    queryKey: ["access-logs", from, to, role, action, cardType, status],
    queryFn: async () => {
      let q = supabase.from("access_logs").select("*").order("scanned_at", { ascending: false }).limit(500);
      if (from) q = q.gte("scanned_at", `${from}T00:00:00`);
      if (to) q = q.lte("scanned_at", `${to}T23:59:59`);
      if (role !== "all") q = q.eq("role", role);
      if (action !== "all") q = q.eq("action", action);
      if (cardType !== "all") q = q.eq("card_type", cardType);
      if (status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as LogRow[];
    },
    refetchInterval: 15000,
  });

  const userIds = useMemo(() => Array.from(new Set(logs.map(l => l.user_id))), [logs]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["access-logs-profiles", userIds.join(",")],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, student_id, program")
        .in("user_id", userIds);
      return (data || []) as Profile[];
    },
  });

  const profileMap = useMemo(() => {
    const m = new Map<string, Profile>();
    profiles.forEach(p => m.set(p.user_id, p));
    return m;
  }, [profiles]);

  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const s = search.toLowerCase();
    return logs.filter(l => {
      const p = profileMap.get(l.user_id);
      return [p?.full_name, p?.student_id, p?.program, l.gate_name].some(v => (v || "").toLowerCase().includes(s));
    });
  }, [logs, search, profileMap]);

  const today = todayISO();
  const todays = logs.filter(l => l.scanned_at.startsWith(today));
  const checkInsToday = todays.filter(l => l.action === "check_in" && l.status === "success").length;
  const checkOutsToday = todays.filter(l => l.action === "check_out" && l.status === "success").length;
  const failedToday = todays.filter(l => l.status !== "success").length;

  // Compute "currently inside" from latest action per user (success only)
  const insideNow = useMemo(() => {
    const latest = new Map<string, string>();
    [...logs].reverse().forEach(l => { if (l.status === "success") latest.set(l.user_id, l.action); });
    return Array.from(latest.values()).filter(a => a === "check_in").length;
  }, [logs]);

  const exportCSV = () => {
    const rows = [
      ["Time", "Name", "Student/Staff ID", "Role", "Program", "Card", "Action", "Status", "Gate"],
      ...filtered.map(l => {
        const p = profileMap.get(l.user_id);
        return [
          new Date(l.scanned_at).toLocaleString(),
          p?.full_name || "—",
          p?.student_id || l.user_id.slice(0, 8),
          l.role,
          p?.program || "—",
          l.card_type,
          l.action,
          l.status,
          l.gate_name,
        ];
      }),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `access-logs-${todayISO()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Access Logs</h1>
            <p className="text-sm text-muted-foreground">Real-time card scan activity across all gates.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Inside Campus Now" value={insideNow} icon={Users} tone="primary" />
          <StatCard label="Check-ins Today" value={checkInsToday} icon={LogIn} tone="success" />
          <StatCard label="Check-outs Today" value={checkOutsToday} icon={LogOut} tone="info" />
          <StatCard label="Failed Scans Today" value={failedToday} icon={AlertTriangle} tone="danger" />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search name, student ID, program, gate…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />

            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="professor">Professor</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>

            <Tabs value={action} onValueChange={setAction}>
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                <TabsTrigger value="check_in" className="flex-1">Check-in</TabsTrigger>
                <TabsTrigger value="check_out" className="flex-1">Check-out</TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={cardType} onValueChange={setCardType}>
              <SelectTrigger><SelectValue placeholder="Card type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cards</SelectItem>
                <SelectItem value="digital">Digital</SelectItem>
                <SelectItem value="physical">Physical</SelectItem>
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Card</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Gate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">No scans found for these filters.</TableCell></TableRow>
                )}
                {filtered.map(l => {
                  const p = profileMap.get(l.user_id);
                  const isIn = l.action === "check_in";
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(l.scanned_at).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{p?.full_name || <span className="text-muted-foreground italic">Unknown</span>}</TableCell>
                      <TableCell className="font-mono text-xs">{p?.student_id || "—"}</TableCell>
                      <TableCell className="capitalize text-xs">{l.role}</TableCell>
                      <TableCell className="text-xs">{p?.program || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{l.card_type}</Badge></TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${isIn ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {isIn ? <LogIn className="h-3.5 w-3.5" /> : <LogOut className="h-3.5 w-3.5" />}
                          {isIn ? "Check In" : "Check Out"}
                        </span>
                      </TableCell>
                      <TableCell><Badge variant="outline" className={`capitalize ${statusColor[l.status] || ""}`}>{l.status}</Badge></TableCell>
                      <TableCell className="text-xs">{l.gate_name}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: "primary" | "success" | "danger" | "info" }) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    danger: "bg-red-500/10 text-red-600 dark:text-red-400",
    info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  };
  return (
    <Card>
      <CardContent className="pt-6 flex items-center gap-4">
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
