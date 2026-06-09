import { useEffect, useState } from "react";
import StudentLayout from "@/components/StudentLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, MapPin, Users, Ticket as TicketIcon, Banknote, Clock, Info } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

interface Ev {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  capacity: number;
  image_url: string | null;
  ticket_price: number;
  cancellation_deadline_hours: number;
  refund_policy: string | null;
}

interface MyTicket {
  id: string;
  event_id: string;
  ticket_code: string;
  status: string;
  refund_status: string;
}

const StudentEvents = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Ev[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [myTickets, setMyTickets] = useState<MyTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrTicket, setQrTicket] = useState<MyTicket | null>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [cancelTicket, setCancelTicket] = useState<MyTicket | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: ev } = await supabase
      .from("campus_events")
      .select("*")
      .eq("status", "published")
      .order("starts_at", { ascending: true });
    const list = (ev || []) as Ev[];
    setEvents(list);

    if (list.length) {
      const ids = list.map((e) => e.id);
      const { data: cts } = await supabase
        .from("event_tickets")
        .select("event_id")
        .in("event_id", ids)
        .neq("status", "cancelled");
      const map: Record<string, number> = {};
      (cts || []).forEach((r: any) => { map[r.event_id] = (map[r.event_id] || 0) + 1; });
      setCounts(map);
    }
    if (user) {
      const { data: mine } = await supabase
        .from("event_tickets")
        .select("id, event_id, ticket_code, status, refund_status")
        .eq("user_id", user.id);
      setMyTickets((mine || []) as MyTicket[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const reserve = async (eventId: string) => {
    if (!user) return;
    const { error } = await supabase.from("event_tickets").insert({ event_id: eventId, user_id: user.id });
    if (error) toast.error(error.message);
    else { toast.success("Ticket reserved!"); load(); }
  };

  const canCancel = (ev: Ev) => {
    const deadline = new Date(ev.starts_at);
    deadline.setHours(deadline.getHours() - ev.cancellation_deadline_hours);
    return new Date() < deadline;
  };

  const requestCancel = async () => {
    if (!cancelTicket) return;
    const { error } = await supabase
      .from("event_tickets")
      .update({ status: "cancelled", cancellation_reason: cancelReason || null })
      .eq("id", cancelTicket.id);
    if (error) toast.error(error.message);
    else {
      toast.success(cancelTicket.refund_status === "none" ? "Ticket cancelled" : "Ticket cancelled — refund pending");
      setCancelTicket(null);
      setCancelReason("");
      load();
    }
  };

  const showQr = async (t: MyTicket) => {
    setQrTicket(t);
    const url = await QRCode.toDataURL(t.ticket_code, { width: 320, margin: 1 });
    setQrUrl(url);
  };

  const ticketByEvent = (id: string) => myTickets.find((t) => t.event_id === id && t.status !== "cancelled");
  const cancelledTicket = (id: string) => myTickets.find((t) => t.event_id === id && t.status === "cancelled");

  return (
    <StudentLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Campus Events</h1>
          <p className="text-muted-foreground">Reserve your ticket and show the QR code at the door.</p>
        </div>

        {loading ? <p>Loading...</p> : events.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No upcoming events.</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {events.map((e) => {
              const mine = ticketByEvent(e.id);
              const cancelled = cancelledTicket(e.id);
              const reserved = counts[e.id] || 0;
              const full = e.capacity > 0 && reserved >= e.capacity;
              const cancelAllowed = mine ? canCancel(e) : false;
              return (
                <Card key={e.id}>
                  {e.image_url && <img src={e.image_url} alt={e.title} className="w-full h-40 object-cover rounded-t-lg" />}
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{e.title}</CardTitle>
                      {mine && <Badge>{mine.status === "checked_in" ? "Checked In" : "Reserved"}</Badge>}
                      {cancelled && <Badge variant="destructive">Cancelled</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> {new Date(e.starts_at).toLocaleString()}</div>
                    {e.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {e.location}</div>}
                    <div className="flex items-center gap-2"><Users className="h-4 w-4" /> {reserved}{e.capacity > 0 ? `/${e.capacity}` : ""} attending</div>
                    <div className="flex items-center gap-2"><Banknote className="h-4 w-4" /> {e.ticket_price > 0 ? `$${e.ticket_price.toFixed(2)}` : "Free"}</div>
                    <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> Cancel up to {e.cancellation_deadline_hours}h before</div>
                    {e.refund_policy && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <Info className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{e.refund_policy}</span>
                      </div>
                    )}
                    {e.description && <p className="text-muted-foreground">{e.description}</p>}
                    <div className="flex gap-2 pt-2 flex-wrap">
                      {mine ? (
                        <>
                          <Button size="sm" onClick={() => showQr(mine)}><TicketIcon className="h-4 w-4 mr-1" /> Show Ticket</Button>
                          {mine.status === "reserved" && (
                            <Button size="sm" variant="ghost" onClick={() => setCancelTicket(mine)}>Cancel</Button>
                          )}
                        </>
                      ) : cancelled ? (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{cancelled.refund_status === "pending" ? "Refund pending" : cancelled.refund_status === "approved" ? "Refunded" : cancelled.refund_status === "rejected" ? "Refund rejected" : "Cancelled"}</span>
                        </div>
                      ) : (
                        <Button size="sm" disabled={full} onClick={() => reserve(e.id)}>{full ? "Sold Out" : "Reserve Ticket"}</Button>
                      )}
                    </div>
                    {mine && !cancelAllowed && mine.status === "reserved" && (
                      <p className="text-xs text-muted-foreground">Cancellation window closed</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={!!qrTicket} onOpenChange={(o) => { if (!o) { setQrTicket(null); setQrUrl(""); } }}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Your Ticket</DialogTitle></DialogHeader>
            <div className="flex flex-col items-center space-y-3">
              {qrUrl && <img src={qrUrl} alt="QR" className="rounded border" />}
              <p className="font-mono text-sm">{qrTicket?.ticket_code}</p>
              <p className="text-xs text-muted-foreground text-center">Show this code at the event entrance.</p>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!cancelTicket} onOpenChange={(o) => { if (!o) { setCancelTicket(null); setCancelReason(""); } }}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Cancel Ticket</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Are you sure you want to cancel this ticket?</p>
              <Textarea placeholder="Reason (optional)" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => { setCancelTicket(null); setCancelReason(""); }}>Keep Ticket</Button>
                <Button variant="destructive" size="sm" onClick={requestCancel}>Confirm Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </StudentLayout>
  );
};

export default StudentEvents;
