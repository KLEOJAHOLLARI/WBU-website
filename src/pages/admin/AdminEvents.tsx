import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CalendarDays, MapPin, Users, Ticket, Trash2, Pencil, CheckCircle2, XCircle, Banknote, Clock } from "lucide-react";

interface CampusEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  capacity: number;
  image_url: string | null;
  status: string;
  ticket_price: number;
  cancellation_deadline_hours: number;
  refund_policy: string | null;
  created_at: string;
}

interface TicketRow {
  id: string;
  ticket_code: string;
  status: string;
  checked_in_at: string | null;
  user_id: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  refund_status: string;
  refunded_at: string | null;
  profile?: { full_name: string | null; email: string | null; student_id: string | null } | null;
}

const empty = {
  title: "",
  description: "",
  location: "",
  starts_at: "",
  ends_at: "",
  capacity: 0,
  image_url: "",
  status: "published",
  ticket_price: 0,
  cancellation_deadline_hours: 24,
  refund_policy: "",
};

const AdminEvents = () => {
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...empty });
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [ticketEvent, setTicketEvent] = useState<CampusEvent | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [scanCode, setScanCode] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("campus_events").select("*").order("starts_at", { ascending: false });
    setEvents((data || []) as CampusEvent[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const loadTickets = async (eventId: string) => {
    const { data } = await supabase
      .from("event_tickets")
      .select("id, ticket_code, status, checked_in_at, user_id, cancelled_at, cancellation_reason, refund_status, refunded_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    const rows = (data || []) as TicketRow[];
    const ids = [...new Set(rows.map((r) => r.user_id))];
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, student_id")
        .in("user_id", ids);
      const map = new Map((profs || []).map((p: any) => [p.user_id, p]));
      rows.forEach((r) => { r.profile = map.get(r.user_id) || null; });
    }
    setTickets(rows);
  };

  const save = async () => {
    if (!form.title || !form.starts_at) {
      toast.error("Title and start time required");
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    const payload: any = {
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      capacity: Number(form.capacity) || 0,
      image_url: form.image_url || null,
      status: form.status,
      ticket_price: Number(form.ticket_price) || 0,
      cancellation_deadline_hours: Number(form.cancellation_deadline_hours) || 0,
      refund_policy: form.refund_policy || null,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from("campus_events").update(payload).eq("id", editing));
    } else {
      payload.created_by = u.user?.id;
      ({ error } = await supabase.from("campus_events").insert(payload));
    }
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setOpen(false); setEditing(null); setForm({ ...empty });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this event and all its tickets?")) return;
    const { error } = await supabase.from("campus_events").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  const edit = (e: CampusEvent) => {
    setEditing(e.id);
    setForm({
      title: e.title,
      description: e.description || "",
      location: e.location || "",
      starts_at: e.starts_at.slice(0, 16),
      ends_at: e.ends_at ? e.ends_at.slice(0, 16) : "",
      capacity: e.capacity,
      image_url: e.image_url || "",
      status: e.status,
      ticket_price: e.ticket_price,
      cancellation_deadline_hours: e.cancellation_deadline_hours,
      refund_policy: e.refund_policy || "",
    });
    setOpen(true);
  };

  const checkInByCode = async () => {
    const code = scanCode.trim();
    if (!code) return;
    const { data: t, error } = await supabase
      .from("event_tickets")
      .select("id, event_id, status")
      .eq("ticket_code", code)
      .maybeSingle();
    if (error || !t) { toast.error("Ticket not found"); return; }
    if (ticketEvent && t.event_id !== ticketEvent.id) { toast.error("Ticket is for another event"); return; }
    if (t.status === "checked_in") { toast.warning("Already checked in"); return; }
    if (t.status === "cancelled") { toast.error("Ticket cancelled"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error: e2 } = await supabase
      .from("event_tickets")
      .update({ status: "checked_in", checked_in_at: new Date().toISOString(), checked_in_by: u.user?.id })
      .eq("id", t.id);
    if (e2) toast.error(e2.message);
    else { toast.success("Checked in"); setScanCode(""); if (ticketEvent) loadTickets(ticketEvent.id); }
  };

  const approveRefund = async (ticketId: string) => {
    const { error } = await supabase.from("event_tickets").update({ refund_status: "approved", refunded_at: new Date().toISOString() }).eq("id", ticketId);
    if (error) toast.error(error.message);
    else { toast.success("Refund approved"); if (ticketEvent) loadTickets(ticketEvent.id); }
  };

  const rejectRefund = async (ticketId: string) => {
    const { error } = await supabase.from("event_tickets").update({ refund_status: "rejected" }).eq("id", ticketId);
    if (error) toast.error(error.message);
    else { toast.success("Refund rejected"); if (ticketEvent) loadTickets(ticketEvent.id); }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Campus Events</h1>
            <p className="text-muted-foreground">Create events and manage ticket reservations</p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm({ ...empty }); } }}>
            <DialogTrigger asChild><Button>New Event</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Event</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Starts</Label><Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
                  <div><Label>Ends</Label><Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Capacity (0 = unlimited)</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
                  <div>
                    <Label>Status</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Ticket Price</Label><Input type="number" value={form.ticket_price} onChange={(e) => setForm({ ...form, ticket_price: Number(e.target.value) })} /></div>
                  <div><Label>Cancel Deadline (hrs before)</Label><Input type="number" value={form.cancellation_deadline_hours} onChange={(e) => setForm({ ...form, cancellation_deadline_hours: Number(e.target.value) })} /></div>
                </div>
                <div><Label>Refund Policy</Label><Textarea placeholder="e.g. Full refund before 24h, 50% within 24h" value={form.refund_policy} onChange={(e) => setForm({ ...form, refund_policy: e.target.value })} /></div>
                <div><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? <p>Loading...</p> : events.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No events yet.</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {events.map((e) => (
              <Card key={e.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{e.title}</CardTitle>
                    <Badge variant={e.status === "published" ? "default" : e.status === "cancelled" ? "destructive" : "secondary"}>{e.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> {new Date(e.starts_at).toLocaleString()}</div>
                  {e.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {e.location}</div>}
                  <div className="flex items-center gap-2"><Users className="h-4 w-4" /> Capacity: {e.capacity || "Unlimited"}</div>
                  <div className="flex items-center gap-2"><Banknote className="h-4 w-4" /> {e.ticket_price > 0 ? `$${e.ticket_price.toFixed(2)}` : "Free"}</div>
                  <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> Cancel up to {e.cancellation_deadline_hours}h before</div>
                  {e.refund_policy && <p className="text-muted-foreground line-clamp-2">{e.refund_policy}</p>}
                  {e.description && <p className="text-muted-foreground line-clamp-2">{e.description}</p>}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => { setTicketEvent(e); loadTickets(e.id); }}><Ticket className="h-4 w-4 mr-1" /> Tickets</Button>
                    <Button size="sm" variant="ghost" onClick={() => edit(e)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!ticketEvent} onOpenChange={(o) => { if (!o) setTicketEvent(null); }}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Tickets — {ticketEvent?.title}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="Paste/scan ticket code" value={scanCode} onChange={(e) => setScanCode(e.target.value)} />
                <Button onClick={checkInByCode}>Check in</Button>
              </div>
              <div className="text-sm text-muted-foreground">
                {tickets.length} reserved · {tickets.filter((t) => t.status === "checked_in").length} checked in
              </div>
              <div className="space-y-2">
                {tickets.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded border p-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium">{t.profile?.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{t.profile?.student_id || t.profile?.email} · {t.ticket_code}</div>
                      {t.status === "cancelled" && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Cancelled {t.cancelled_at ? new Date(t.cancelled_at).toLocaleString() : ""}
                          {t.cancellation_reason ? ` · Reason: ${t.cancellation_reason}` : ""}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {t.status === "checked_in" ? (
                        <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" /> In</Badge>
                      ) : t.status === "cancelled" ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Cancelled</Badge>
                          {ticketEvent && ticketEvent.ticket_price > 0 && t.refund_status === "pending" && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => approveRefund(t.id)}>Approve Refund</Button>
                              <Button size="sm" variant="ghost" onClick={() => rejectRefund(t.id)}>Reject</Button>
                            </>
                          )}
                          {ticketEvent && ticketEvent.ticket_price > 0 && t.refund_status === "approved" && (
                            <Badge variant="default" className="bg-green-600">Refunded</Badge>
                          )}
                          {ticketEvent && ticketEvent.ticket_price > 0 && t.refund_status === "rejected" && (
                            <Badge variant="secondary">Refund Rejected</Badge>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={async () => {
                            const { data: u } = await supabase.auth.getUser();
                            await supabase.from("event_tickets").update({ status: "checked_in", checked_in_at: new Date().toISOString(), checked_in_by: u.user?.id }).eq("id", t.id);
                            if (ticketEvent) loadTickets(ticketEvent.id);
                          }}>Check in</Button>
                          <Button size="sm" variant="ghost" onClick={async () => {
                            if (!confirm("Cancel this ticket?")) return;
                            await supabase.from("event_tickets").update({ status: "cancelled" }).eq("id", t.id);
                            if (ticketEvent) loadTickets(ticketEvent.id);
                          }}>Cancel</Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {tickets.length === 0 && <p className="text-center text-muted-foreground py-6">No tickets yet.</p>}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminEvents;
