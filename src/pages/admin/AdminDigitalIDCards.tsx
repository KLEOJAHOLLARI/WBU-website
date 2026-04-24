import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, Power, PowerOff, Search, Calendar, IdCard } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Row {
  id: string;
  user_id: string;
  status: string;
  issue_date: string;
  reissue_count: number;
  verification_token: string;
  profile?: { full_name: string; student_id: string | null; program: string | null; email: string };
}

const AdminDigitalIDCards = () => {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [editDate, setEditDate] = useState("");
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-id-cards"],
    queryFn: async () => {
      const { data: cards, error } = await supabase
        .from("student_id_cards")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ids = (cards || []).map(c => c.user_id);
      if (ids.length === 0) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, student_id, program, email")
        .in("user_id", ids);
      const pmap = new Map((profs || []).map(p => [p.user_id, p]));
      return (cards || []).map(c => ({ ...c, profile: pmap.get(c.user_id) })) as Row[];
    },
  });

  const updateCard = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) => {
      const { error } = await supabase.from("student_id_cards").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-id-cards"] });
      toast({ title: "Card updated" });
    },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const reissue = async (row: Row) => {
    // Generate new token client-side via crypto
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
    await updateCard.mutateAsync({
      id: row.id,
      patch: {
        verification_token: token,
        issue_date: new Date().toISOString().slice(0, 10),
        reissue_count: (row.reissue_count || 0) + 1,
        status: "active",
      } as any,
    });
  };

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      r.profile?.full_name?.toLowerCase().includes(q) ||
      r.profile?.student_id?.toLowerCase().includes(q) ||
      r.profile?.email?.toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <IdCard className="h-6 w-6" /> Digital ID Cards
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage student ID cards — activate, suspend, or reissue.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, ID, email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Cards ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
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
                  {filtered.map(row => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">{row.profile?.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{row.profile?.email}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.profile?.student_id || "—"}</TableCell>
                      <TableCell className="text-xs">{row.profile?.program || "—"}</TableCell>
                      <TableCell className="text-xs">{format(new Date(row.issue_date), "dd MMM yyyy")}</TableCell>
                      <TableCell>{row.reissue_count}</TableCell>
                      <TableCell>
                        {row.status === "active" ? (
                          <Badge>Active</Badge>
                        ) : (
                          <Badge variant="destructive" className="uppercase">{row.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          {row.status === "active" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateCard.mutate({ id: row.id, patch: { status: "suspended" } as any })}
                            >
                              <PowerOff className="mr-1 h-3.5 w-3.5" /> Suspend
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateCard.mutate({ id: row.id, patch: { status: "active" } as any })}
                            >
                              <Power className="mr-1 h-3.5 w-3.5" /> Activate
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => { setEditing(row); setEditDate(row.issue_date); }}>
                            <Calendar className="mr-1 h-3.5 w-3.5" /> Date
                          </Button>
                          <Button size="sm" onClick={() => reissue(row)}>
                            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Reissue
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Issue Date</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Issue Date</Label>
            <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!editing) return;
                await updateCard.mutateAsync({ id: editing.id, patch: { issue_date: editDate } as any });
                setEditing(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminDigitalIDCards;
