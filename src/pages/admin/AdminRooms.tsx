import AdminLayout from "@/components/AdminLayout";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Building2, CalendarCheck, Check, X, AlertTriangle } from "lucide-react";

type Room = { id: string; name: string; building: string; floor: string; capacity: number; room_type: string; equipment: string; is_active: boolean };
type Booking = {
  id: string; room_id: string; requested_by: string; purpose: string;
  booking_date: string; start_time: string; end_time: string;
  status: string; notes: string; review_note: string | null;
  created_at: string;
};

const EMPTY_ROOM: Partial<Room> = { name: "", building: "", floor: "", capacity: 30, room_type: "classroom", equipment: "", is_active: true };

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  cancelled: "bg-slate-100 text-slate-700",
};

const AdminRooms = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Room>>(EMPTY_ROOM);

  const { data: rooms = [] } = useQuery({
    queryKey: ["admin-rooms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("*").order("name");
      if (error) throw error;
      return data as Room[];
    },
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_bookings")
        .select("*")
        .order("booking_date", { ascending: false });
      if (error) throw error;
      return data as Booking[];
    },
  });

  // Profile lookup for booking requester names
  const requesterIds = Array.from(new Set(bookings.map((b) => b.requested_by)));
  const { data: profiles = [] } = useQuery({
    queryKey: ["booking-profiles", requesterIds.join(",")],
    enabled: requesterIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", requesterIds);
      if (error) throw error;
      return data as { user_id: string; full_name: string; email: string }[];
    },
  });
  const profileMap = new Map(profiles.map((p) => [p.user_id, p]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  const createRoom = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("rooms").insert(form as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Room added");
      qc.invalidateQueries({ queryKey: ["admin-rooms"] });
      setOpen(false);
      setForm(EMPTY_ROOM);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeRoom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rooms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Room removed");
      qc.invalidateQueries({ queryKey: ["admin-rooms"] });
    },
  });

  const reviewBooking = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note?: string }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await supabase
        .from("room_bookings")
        .update({ status, review_note: note || null, reviewed_by: userId, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking updated");
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
  });

  // Conflict detector for an approved booking on same room/date with overlapping time
  const hasConflict = (b: Booking) => {
    return bookings.some((other) =>
      other.id !== b.id &&
      other.room_id === b.room_id &&
      other.booking_date === b.booking_date &&
      other.status === "approved" &&
      !(other.end_time <= b.start_time || other.start_time >= b.end_time)
    );
  };

  return (
    <AdminLayout>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6" /> Rooms & Bookings
          </h1>
          <p className="text-sm text-muted-foreground">Manage classrooms and review booking requests</p>
        </div>
      </div>

      <Tabs defaultValue="bookings" className="mt-6">
        <TabsList>
          <TabsTrigger value="bookings"><CalendarCheck className="h-4 w-4 mr-1" /> Bookings ({bookings.length})</TabsTrigger>
          <TabsTrigger value="rooms"><Building2 className="h-4 w-4 mr-1" /> Rooms ({rooms.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-4 space-y-3">
          {bookings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
              No booking requests yet.
            </div>
          ) : bookings.map((b) => {
            const room = roomMap.get(b.room_id);
            const requester = profileMap.get(b.requested_by);
            const conflict = b.status === "pending" && hasConflict(b);
            return (
              <div key={b.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">{b.purpose}</h3>
                      <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${STATUS_STYLES[b.status]}`}>{b.status}</span>
                      {conflict && (
                        <span className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                          <AlertTriangle className="h-3 w-3" /> conflict
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {room?.name || "Unknown room"} · {new Date(b.booking_date).toLocaleDateString()} · {b.start_time}–{b.end_time}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Requested by {requester?.full_name || "Unknown"} ({requester?.email || ""})
                    </p>
                    {b.notes && <p className="mt-2 text-sm text-muted-foreground">{b.notes}</p>}
                    {b.review_note && <p className="mt-2 text-xs italic text-muted-foreground">Note: {b.review_note}</p>}
                  </div>
                  {b.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => reviewBooking.mutate({ id: b.id, status: "approved" })}>
                        <Check className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => reviewBooking.mutate({ id: b.id, status: "rejected" })}>
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="rooms" className="mt-4 space-y-3">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Add Room</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Room</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Building</Label><Input value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} /></div>
                  <div><Label>Floor</Label><Input value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })} /></div>
                  <div>
                    <Label>Type</Label>
                    <Select value={form.room_type} onValueChange={(v) => setForm({ ...form, room_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="classroom">Classroom</SelectItem>
                        <SelectItem value="lab">Lab</SelectItem>
                        <SelectItem value="auditorium">Auditorium</SelectItem>
                        <SelectItem value="meeting">Meeting Room</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Equipment</Label><Input value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} placeholder="Projector, whiteboard, ..." /></div>
              </div>
              <DialogFooter>
                <Button onClick={() => createRoom.mutate()} disabled={!form.name || createRoom.isPending}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {rooms.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
              No rooms yet. Add classrooms to enable booking requests.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((r) => (
                <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{r.name}</h3>
                      <p className="text-xs text-muted-foreground capitalize">{r.room_type} · cap. {r.capacity}</p>
                      {(r.building || r.floor) && (
                        <p className="text-xs text-muted-foreground">{r.building} {r.floor && `· Floor ${r.floor}`}</p>
                      )}
                      {r.equipment && <p className="mt-1 text-xs text-muted-foreground">🛠 {r.equipment}</p>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeRoom.mutate(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminRooms;
