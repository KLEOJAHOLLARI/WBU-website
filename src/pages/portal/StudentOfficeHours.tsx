import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import StudentLayout from "@/components/StudentLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Calendar, MapPin, Users, Search } from "lucide-react";
import { format } from "date-fns";

type Slot = {
  id: string;
  professor_id: string;
  start_at: string;
  end_at: string;
  location: string | null;
  capacity: number;
  notes: string | null;
};

type Booking = {
  id: string;
  slot_id: string;
  student_id: string;
  status: string;
  reason: string | null;
};

const db: any = supabase;

const StudentOfficeHours = () => {
  const { user } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [profs, setProfs] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [reason, setReason] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const nowIso = new Date().toISOString();
    const { data: s } = await db
      .from("office_hours_slots")
      .select("*")
      .gte("end_at", nowIso)
      .order("start_at", { ascending: true });
    setSlots(s || []);

    const profIds = Array.from(new Set((s || []).map((x: Slot) => x.professor_id)));
    if (profIds.length) {
      const { data: p } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", profIds as string[]);
      const map: Record<string, string> = {};
      (p || []).forEach((x: any) => { map[x.user_id] = x.full_name; });
      setProfs(map);
    }

    const slotIds = (s || []).map((x: Slot) => x.id);
    if (slotIds.length) {
      const { data: b } = await db
        .from("office_hours_bookings")
        .select("slot_id, status")
        .in("slot_id", slotIds)
        .eq("status", "booked");
      const c: Record<string, number> = {};
      (b || []).forEach((x: any) => { c[x.slot_id] = (c[x.slot_id] || 0) + 1; });
      setCounts(c);
    }

    const { data: mine } = await db
      .from("office_hours_bookings")
      .select("*")
      .eq("student_id", user.id);
    setMyBookings(mine || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const book = async () => {
    if (!user || !selected) return;
    const taken = counts[selected.id] || 0;
    if (taken >= selected.capacity) {
      toast.error("Slot is full");
      return;
    }
    const { error } = await db.from("office_hours_bookings").insert({
      slot_id: selected.id,
      student_id: user.id,
      reason: reason || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Booked! The professor has been notified.");
    setSelected(null);
    setReason("");
    load();
  };

  const cancel = async (id: string) => {
    const { error } = await db
      .from("office_hours_bookings")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Booking cancelled");
    load();
  };

  const myBookedIds = new Set(myBookings.filter((b) => b.status === "booked").map((b) => b.slot_id));
  const upcoming = myBookings.filter((b) => b.status === "booked");

  const filtered = slots.filter((s) => {
    if (!search) return true;
    const name = profs[s.professor_id] || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <StudentLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="font-display text-3xl font-bold">Office Hours</h1>
          <p className="text-sm text-muted-foreground mt-1">Book a meeting with a professor.</p>
        </div>

        {upcoming.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold mb-3">Your bookings</h2>
              <div className="space-y-2">
                {upcoming.map((b) => {
                  const s = slots.find((x) => x.id === b.slot_id);
                  if (!s) return null;
                  return (
                    <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <p className="font-medium text-sm">{profs[s.professor_id] || "Professor"}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(s.start_at), "EEE, MMM d · HH:mm")} – {format(new Date(s.end_at), "HH:mm")}
                          {s.location && ` · ${s.location}`}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => cancel(b.id)}>Cancel</Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search professor..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="space-y-2">
          <h2 className="font-semibold">Available slots</h2>
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> :
            filtered.length === 0 ? <p className="text-sm text-muted-foreground">No upcoming slots.</p> :
            filtered.map((s) => {
              const taken = counts[s.id] || 0;
              const full = taken >= s.capacity;
              const booked = myBookedIds.has(s.id);
              return (
                <Card key={s.id}>
                  <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium">{profs[s.professor_id] || "Professor"}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />
                          {format(new Date(s.start_at), "EEE, MMM d · HH:mm")} – {format(new Date(s.end_at), "HH:mm")}
                        </span>
                        {s.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{s.location}</span>}
                        <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{taken}/{s.capacity}</span>
                      </div>
                      {s.notes && <p className="text-xs text-muted-foreground">{s.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {booked ? (
                        <Badge>Booked</Badge>
                      ) : full ? (
                        <Badge variant="secondary">Full</Badge>
                      ) : (
                        <Button size="sm" onClick={() => setSelected(s)}>Book</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>

        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Book office hours</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">{profs[selected.professor_id]}</p>
                  <p className="text-muted-foreground">
                    {format(new Date(selected.start_at), "EEE, MMM d · HH:mm")} – {format(new Date(selected.end_at), "HH:mm")}
                  </p>
                </div>
                <div>
                  <Label>Reason (optional)</Label>
                  <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What would you like to discuss?" />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button>
              <Button onClick={book}>Confirm booking</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </StudentLayout>
  );
};

export default StudentOfficeHours;
