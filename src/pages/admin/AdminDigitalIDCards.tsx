import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, Power, PowerOff, Search, Calendar, IdCard, History, CalendarX } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BaseRow {
  id: string;
  user_id: string;
  status: string;
  issue_date: string;
  reissue_count: number;
  verification_token: string;
}

interface StudentRow extends BaseRow {
  profile?: { full_name: string; student_id: string | null; program: string | null; email: string };
}

interface ProfRow extends BaseRow {
  profile?: { full_name: string; email: string };
  prof?: { title: string | null; department: string | null };
}

const useUpdate = (table: "student_id_cards" | "professor_id_cards", queryKey: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) => {
      const { error } = await (supabase as any).from(table).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] });
      toast({ title: "Card updated" });
    },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });
};

const newToken = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
};

const ActionButtons = ({
  row,
  onSuspend,
  onActivate,
  onExpire,
  onEditDate,
  onReissue,
  onHistory,
}: {
  row: BaseRow;
  onSuspend: () => void;
  onActivate: () => void;
  onExpire: () => void;
  onEditDate: () => void;
  onReissue: () => void;
  onHistory: () => void;
}) => (
  <div className="inline-flex flex-wrap gap-1 justify-end">
    {row.status === "active" ? (
      <Button size="sm" variant="outline" onClick={onSuspend}>
        <PowerOff className="mr-1 h-3.5 w-3.5" /> Suspend
      </Button>
    ) : (
      <Button size="sm" variant="outline" onClick={onActivate}>
        <Power className="mr-1 h-3.5 w-3.5" /> Activate
      </Button>
    )}
    {row.status !== "expired" && (
      <Button size="sm" variant="outline" onClick={onExpire}>
        <CalendarX className="mr-1 h-3.5 w-3.5" /> Expire
      </Button>
    )}
    <Button size="sm" variant="outline" onClick={onEditDate}>
      <Calendar className="mr-1 h-3.5 w-3.5" /> Date
    </Button>
    <Button size="sm" variant="outline" onClick={onHistory}>
      <History className="mr-1 h-3.5 w-3.5" /> Logs
    </Button>
    <Button size="sm" onClick={onReissue}>
      <RefreshCw className="mr-1 h-3.5 w-3.5" /> Reissue
    </Button>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "active") return <Badge>Active</Badge>;
  if (status === "expired") return <Badge variant="destructive" className="uppercase">Expired</Badge>;
  if (status === "suspended") return <Badge variant="destructive" className="uppercase">Suspended</Badge>;
  return <Badge variant="secondary" className="uppercase">{status}</Badge>;
};

const STATUS_COLORS: Record<string, string> = {
  success: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
  denied: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  expired: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  inactive: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30",
};

const CardHistorySheet = ({
  target,
  onClose,
}: {
  target: { user_id: string; name: string; status: string } | null;
  onClose: () => void;
}) => {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["card-history", target?.user_id],
    queryFn: async () => {
      if (!target) return [];
      const { data, error } = await supabase
        .from("access_logs")
        .select("id, action, status, scanned_at, gate_name, card_type")
        .eq("user_id", target.user_id)
        .order("scanned_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!target,
  });

  const insideNow = logs.length > 0 && logs[0].status === "success" && logs[0].action === "check_in";

  return (
    <Sheet open={!!target} onOpenChange={o => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" /> {target?.name}
          </SheetTitle>
          <SheetDescription>
            Card status: <StatusBadge status={target?.status || ""} />
            {insideNow && <Badge variant="secondary" className="ml-2">Inside campus</Badge>}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No scans recorded for this card yet.</p>
          ) : (
            logs.map(l => (
              <div key={l.id} className={`border rounded-lg p-3 ${STATUS_COLORS[l.status] || "bg-muted"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm capitalize">
                    {l.action.replace("_", " ")}
                    <span className="ml-2 text-xs uppercase opacity-70">[{l.status}]</span>
                  </div>
                  <div className="text-xs opacity-80">
                    {formatDistanceToNow(new Date(l.scanned_at), { addSuffix: true })}
                  </div>
                </div>
                <div className="text-xs opacity-80 mt-1">
                  {l.gate_name} · {l.card_type} card · {format(new Date(l.scanned_at), "dd MMM HH:mm")}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

const AdminDigitalIDCards = () => {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ id: string; issue_date: string; table: "student_id_cards" | "professor_id_cards" } | null>(null);
  const [editDate, setEditDate] = useState("");
  const [historyFor, setHistoryFor] = useState<{ user_id: string; name: string; status: string } | null>(null);

  const updateStudent = useUpdate("student_id_cards", "admin-id-cards");
  const updateProf = useUpdate("professor_id_cards", "admin-prof-id-cards");

  // STUDENT cards
  const { data: studentRows = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["admin-id-cards"],
    queryFn: async () => {
      const { data: cards } = await supabase
        .from("student_id_cards")
        .select("*")
        .order("created_at", { ascending: false });
      const ids = (cards || []).map(c => c.user_id);
      if (ids.length === 0) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, student_id, program, email")
        .in("user_id", ids);
      const pmap = new Map((profs || []).map(p => [p.user_id, p]));
      return (cards || []).map(c => ({ ...c, profile: pmap.get(c.user_id) })) as StudentRow[];
    },
  });

  // PROFESSOR cards
  const { data: profRows = [], isLoading: profsLoading } = useQuery({
    queryKey: ["admin-prof-id-cards"],
    queryFn: async () => {
      const { data: cards } = await (supabase as any)
        .from("professor_id_cards")
        .select("*")
        .order("created_at", { ascending: false });
      const ids = ((cards || []) as any[]).map((c: any) => c.user_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", ids);
      const pmap = new Map((profiles || []).map(p => [p.user_id, p]));

      // Match professors directory by name to enrich title/department
      const names = (profiles || []).map(p => p.full_name).filter(Boolean);
      const { data: profDir } = names.length
        ? await supabase.from("professors").select("name, title, department").in("name", names)
        : { data: [] as any[] };
      const dirmap = new Map(((profDir || []) as any[]).map((d: any) => [d.name, d]));

      return ((cards || []) as any[]).map((c: any) => {
        const prof = pmap.get(c.user_id);
        return {
          ...c,
          profile: prof,
          prof: prof?.full_name ? dirmap.get(prof.full_name) : undefined,
        };
      }) as ProfRow[];
    },
  });

  const filterFn = (r: any) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      r.profile?.full_name?.toLowerCase().includes(q) ||
      r.profile?.student_id?.toLowerCase().includes(q) ||
      r.profile?.email?.toLowerCase().includes(q)
    );
  };

  const filteredStudents = studentRows.filter(filterFn);
  const filteredProfs = profRows.filter(filterFn);

  const reissueStudent = (row: StudentRow) =>
    updateStudent.mutate({
      id: row.id,
      patch: {
        verification_token: newToken(),
        issue_date: new Date().toISOString().slice(0, 10),
        reissue_count: (row.reissue_count || 0) + 1,
        status: "active",
      },
    });

  const reissueProf = (row: ProfRow) =>
    updateProf.mutate({
      id: row.id,
      patch: {
        verification_token: newToken(),
        issue_date: new Date().toISOString().slice(0, 10),
        reissue_count: (row.reissue_count || 0) + 1,
        status: "active",
      },
    });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <IdCard className="h-6 w-6" /> Digital ID Cards
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage student & faculty ID cards.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name, ID, email…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
          </div>
        </div>

        <Tabs defaultValue="students">
          <TabsList>
            <TabsTrigger value="students">Students ({filteredStudents.length})</TabsTrigger>
            <TabsTrigger value="faculty">Faculty ({filteredProfs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Student Cards</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                {studentsLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : filteredStudents.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">No cards found.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Program</TableHead>
                        <TableHead>Issue Date</TableHead>
                        <TableHead>Reissues</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map(row => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <div className="font-medium text-foreground">{row.profile?.full_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{row.profile?.email}</div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{row.profile?.student_id || "—"}</TableCell>
                          <TableCell className="text-xs">{row.profile?.program || "—"}</TableCell>
                          <TableCell className="text-xs">{format(new Date(row.issue_date), "dd MMM yyyy")}</TableCell>
                          <TableCell>{row.reissue_count}</TableCell>
                          <TableCell><StatusBadge status={row.status} /></TableCell>
                          <TableCell className="text-right">
                            <ActionButtons
                              row={row}
                              onSuspend={() => updateStudent.mutate({ id: row.id, patch: { status: "suspended" } })}
                              onActivate={() => updateStudent.mutate({ id: row.id, patch: { status: "active" } })}
                              onExpire={() => updateStudent.mutate({ id: row.id, patch: { status: "expired" } })}
                              onEditDate={() => { setEditing({ id: row.id, issue_date: row.issue_date, table: "student_id_cards" }); setEditDate(row.issue_date); }}
                              onReissue={() => reissueStudent(row)}
                              onHistory={() => setHistoryFor({ user_id: row.user_id, name: row.profile?.full_name || "Card", status: row.status })}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faculty" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Faculty Cards</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                {profsLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : filteredProfs.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">No faculty cards found.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Professor</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Issue Date</TableHead>
                        <TableHead>Reissues</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProfs.map(row => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <div className="font-medium text-foreground">{row.profile?.full_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{row.profile?.email}</div>
                          </TableCell>
                          <TableCell className="text-xs">{row.prof?.title || "—"}</TableCell>
                          <TableCell className="text-xs">{row.prof?.department || "—"}</TableCell>
                          <TableCell className="text-xs">{format(new Date(row.issue_date), "dd MMM yyyy")}</TableCell>
                          <TableCell>{row.reissue_count}</TableCell>
                          <TableCell><StatusBadge status={row.status} /></TableCell>
                          <TableCell className="text-right">
                            <ActionButtons
                              row={row}
                              onSuspend={() => updateProf.mutate({ id: row.id, patch: { status: "suspended" } })}
                              onActivate={() => updateProf.mutate({ id: row.id, patch: { status: "active" } })}
                              onExpire={() => updateProf.mutate({ id: row.id, patch: { status: "expired" } })}
                              onEditDate={() => { setEditing({ id: row.id, issue_date: row.issue_date, table: "professor_id_cards" }); setEditDate(row.issue_date); }}
                              onReissue={() => reissueProf(row)}
                              onHistory={() => setHistoryFor({ user_id: row.user_id, name: row.profile?.full_name || "Card", status: row.status })}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Issue Date</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Issue Date</Label>
            <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!editing) return;
                const mut = editing.table === "student_id_cards" ? updateStudent : updateProf;
                await mut.mutateAsync({ id: editing.id, patch: { issue_date: editDate } });
                setEditing(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CardHistorySheet target={historyFor} onClose={() => setHistoryFor(null)} />
    </AdminLayout>
  );
};

export default AdminDigitalIDCards;
