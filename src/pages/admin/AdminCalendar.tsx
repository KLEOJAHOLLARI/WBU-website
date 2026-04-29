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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, CalendarDays } from "lucide-react";

type EventRow = {
  id: string;
  title: string;
  description: string;
  event_type: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string;
  color: string;
  audience: string;
  program: string | null;
  is_published: boolean;
  created_at: string;
};

const EMPTY: Partial<EventRow> = {
  title: "",
  description: "",
  event_type: "event",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: null,
  start_time: "",
  end_time: "",
  location: "",
  color: "#3b82f6",
  audience: "all",
  is_published: true,
};

const TYPE_COLORS: Record<string, string> = {
  holiday: "bg-rose-100 text-rose-800",
  deadline: "bg-amber-100 text-amber-800",
  ceremony: "bg-purple-100 text-purple-800",
  exam: "bg-blue-100 text-blue-800",
  event: "bg-emerald-100 text-emerald-800",
};

const AdminCalendar = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<EventRow>>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["admin-calendar-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .order("start_date", { ascending: true });
      if (error) throw error;
      return data as EventRow[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: Partial<EventRow>) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const clean = {
        ...payload,
        start_time: payload.start_time || null,
        end_time: payload.end_time || null,
        end_date: payload.end_date || null,
        program: payload.audience === "program" ? payload.program || null : null,
      };
      if (editId) {
        const { error } = await supabase.from("calendar_events").update(clean).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("calendar_events")
          .insert({ ...clean, created_by: userId } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Event updated" : "Event added");
      qc.invalidateQueries({ queryKey: ["admin-calendar-events"] });
      setOpen(false);
      setForm(EMPTY);
      setEditId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calendar_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event removed");
      qc.invalidateQueries({ queryKey: ["admin-calendar-events"] });
    },
  });

  const startEdit = (e: EventRow) => {
    setEditId(e.id);
    setForm(e);
    setOpen(true);
  };

  return (
    <AdminLayout>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-6 w-6" /> Academic Calendar
          </h1>
          <p className="text-sm text-muted-foreground">Holidays, deadlines, ceremonies & university events</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(EMPTY); setEditId(null); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Add Event</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Edit" : "New"} Calendar Event</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="holiday">Holiday</SelectItem>
                      <SelectItem value="deadline">Deadline</SelectItem>
                      <SelectItem value="ceremony">Ceremony</SelectItem>
                      <SelectItem value="exam">Exam Period</SelectItem>
                      <SelectItem value="event">General Event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Color</Label>
                  <Input type="color" value={form.color || "#3b82f6"} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={form.start_date || ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div>
                  <Label>End Date (optional)</Label>
                  <Input type="date" value={form.end_date || ""} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Time</Label>
                  <Input type="time" value={form.start_time || ""} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input type="time" value={form.end_time || ""} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Location</Label>
                <Input value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Audience</Label>
                  <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Everyone</SelectItem>
                      <SelectItem value="students">Students</SelectItem>
                      <SelectItem value="professors">Professors</SelectItem>
                      <SelectItem value="admins">Admins</SelectItem>
                      <SelectItem value="program">Specific Program</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.audience === "program" && (
                  <div>
                    <Label>Program slug</Label>
                    <Input value={form.program || ""} onChange={(e) => setForm({ ...form, program: e.target.value })} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_published ?? true} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
                <Label>Published (visible to audience)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => upsert.mutate(form)} disabled={!form.title || !form.start_date || upsert.isPending}>
                {editId ? "Save Changes" : "Create Event"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No events yet. Add holidays, deadlines, and ceremonies to populate the academic calendar.
          </div>
        ) : (
          events.map((e) => (
            <div key={e.id} className="rounded-xl border border-border bg-card p-4 flex items-start gap-4">
              <div className="w-1.5 self-stretch rounded-full" style={{ background: e.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-foreground">{e.title}</h3>
                  <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${TYPE_COLORS[e.event_type] || ""}`}>
                    {e.event_type}
                  </span>
                  {!e.is_published && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">DRAFT</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(e.start_date).toLocaleDateString()}
                  {e.end_date && e.end_date !== e.start_date && ` → ${new Date(e.end_date).toLocaleDateString()}`}
                  {e.start_time && ` · ${e.start_time}`}
                  {e.end_time && `–${e.end_time}`}
                  {e.location && ` · ${e.location}`}
                  {` · ${e.audience}${e.program ? ` (${e.program})` : ""}`}
                </p>
                {e.description && <p className="mt-2 text-sm text-muted-foreground">{e.description}</p>}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => startEdit(e)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => remove.mutate(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCalendar;
