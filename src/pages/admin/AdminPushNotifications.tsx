import AdminLayout from "@/components/AdminLayout";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Bell, Send, Trash2 } from "lucide-react";

type PushRow = {
  id: string; title: string; body: string; link: string | null;
  audience_role: string; audience_program: string | null; audience_year: number | null;
  sent_at: string; sent_by: string;
};

const EMPTY = { title: "", body: "", link: "", audience_role: "all", audience_program: "", audience_year: "" };

const AdminPushNotifications = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-push"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("push_notifications")
        .select("*")
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return data as PushRow[];
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error("Not authenticated");
      const payload = {
        title: form.title,
        body: form.body,
        link: form.link || null,
        audience_role: form.audience_role,
        audience_program: form.audience_program || null,
        audience_year: form.audience_year ? parseInt(form.audience_year) : null,
        sent_by: userId,
      };
      const { error } = await supabase.from("push_notifications").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notification sent");
      qc.invalidateQueries({ queryKey: ["admin-push"] });
      setForm(EMPTY);
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("push_notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin-push"] });
    },
  });

  return (
    <AdminLayout>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6" /> Push Notification Center
          </h1>
          <p className="text-sm text-muted-foreground">Broadcast targeted notifications by role, program, or year</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Send className="h-4 w-4 mr-1" /> New Notification</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Send Notification</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={100} /></div>
              <div><Label>Message</Label><Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} maxLength={500} rows={4} /></div>
              <div><Label>Link (optional)</Label><Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="/portal/exams" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Audience role</Label>
                  <Select value={form.audience_role} onValueChange={(v) => setForm({ ...form, audience_role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="user">Students</SelectItem>
                      <SelectItem value="professor">Professors</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Program</Label><Input value={form.audience_program} onChange={(e) => setForm({ ...form, audience_program: e.target.value })} placeholder="any" /></div>
                <div><Label>Year</Label><Input type="number" value={form.audience_year} onChange={(e) => setForm({ ...form, audience_year: e.target.value })} placeholder="any" /></div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => send.mutate()} disabled={!form.title || !form.body || send.isPending}>
                Send
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No notifications sent yet.
          </div>
        ) : rows.map((n) => (
          <div key={n.id} className="rounded-xl border border-border bg-card p-4 flex items-start gap-4">
            <Bell className="h-5 w-5 text-primary mt-1" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-foreground">{n.title}</h3>
                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{n.audience_role}</span>
                {n.audience_program && <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">{n.audience_program}</span>}
                {n.audience_year && <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Year {n.audience_year}</span>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{n.body}</p>
              {n.link && <p className="mt-1 text-xs text-primary">→ {n.link}</p>}
              <p className="text-[11px] text-muted-foreground mt-2">{new Date(n.sent_at).toLocaleString()}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove.mutate(n.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminPushNotifications;
