import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ProfessorLayout from "@/components/ProfessorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Calendar, MapPin, Users } from "lucide-react";
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
  reason: string | null;
  status: string;
  created_at: string;
};

const db: any = supabase;

const ProfessorOfficeHours = () => {
  const { user } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [students, setStudents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    date: "",
    start: "",
    end: "",
    location: "",
    capacity: 1,
    notes: "",
  });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: s } = await db
      .from("office_hours_slots")
      .select("*")
      .eq("professor_id", user.id)
      .order("start_at", { ascending: true });
    setSlots(s || []);
    const slotIds = (s || []).map((x: Slot) => x.id);
    if (slotIds.length) {
      const { data: b } = await db
        .from("office_hours_bookings")
        .select("*")
        .in("slot_id", slotIds);
      setBookings(b || []);
      const ids = Array.from(new Set((b || []).map((x: Booking) => x.student_id)));
      if (ids.length) {
        const { data: p } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", ids as string[]);
        const map: Record<string, string> = {};
        (p || []).forEach((x: any) => { map[x.user_id] = `${x.full_name} (${x.email})`; });
        setStudents(map);
      }
    } else {
      setBookings([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const create = async () => {
    if (!user) return;
    if (!form.date || !form.start || !form.end) {
      toast.error("Pick date, start and end time");
      return;
    }
    const start_at = new Date(`${form.date}T${form.start}`).toISOString();
    const end_at = new Date(`${form.date}T${form.end}`).toISOString();
    if (new Date(end_at) <= new Date(start_at)) {
      toast.error("End time must be after start");
      return;
    }
    const { error } = await db.from("office_hours_slots").insert({
      professor_id: user.id,
      start_at,
      end_at,
      location: form.location || null,
      capacity: Number(form.capacity) || 1,
      notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Slot created");
    setForm({ date: "", start: "", end: "", location: "", capacity: 1, notes: "" });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await db.from("office_hours_slots").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Slot deleted");
    load();
  };

  const slotBookings = (id: string) => bookings.filter((b) => b.slot_id === id && b.status === "booked");

  return (
    <ProfessorLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="font-display text-3xl font-bold">Office Hours</h1>
          <p className="text-sm text-muted-foreground mt-1">Publish time slots students can book.</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Add a slot</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-6">
            <div className="md:col-span-2">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label>Start</Label>
              <Input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            </div>
            <div>
              <Label>End</Label>
              <Input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
            </div>
            <div>
              <Label>Capacity</Label>
              <Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Location</Label>
              <Input placeholder="Office A201" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="md:col-span-6">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="md:col-span-6 flex justify-end">
              <Button onClick={create}>Create slot</Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Your slots</h2>
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> :
            slots.length === 0 ? <p className="text-sm text-muted-foreground">No slots yet.</p> :
            slots.map((s) => {
              const bks = slotBookings(s.id);
              const taken = bks.length;
              return (
                <Card key={s.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-medium">
                          <Calendar className="h-4 w-4 text-primary" />
                          {format(new Date(s.start_at), "EEE, MMM d · HH:mm")} – {format(new Date(s.end_at), "HH:mm")}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {s.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{s.location}</span>}
                          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{taken}/{s.capacity}</span>
                        </div>
                        {s.notes && <p className="text-xs text-muted-foreground">{s.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={taken >= s.capacity ? "secondary" : "default"}>
                          {taken >= s.capacity ? "Full" : "Open"}
                        </Badge>
                        <Button size="sm" variant="ghost" onClick={() => remove(s.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {bks.length > 0 && (
                      <div className="mt-3 border-t pt-3 space-y-1.5">
                        {bks.map((b) => (
                          <div key={b.id} className="text-sm flex justify-between gap-2">
                            <span className="font-medium">{students[b.student_id] || b.student_id}</span>
                            {b.reason && <span className="text-muted-foreground text-xs italic">"{b.reason}"</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </div>
    </ProfessorLayout>
  );
};

export default ProfessorOfficeHours;
