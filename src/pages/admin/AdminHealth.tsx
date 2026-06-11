import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { HeartPulse, CalendarPlus, Stethoscope, Trash2, Pencil, FileText, Lock } from "lucide-react";

interface StudentOption {
  user_id: string;
  full_name: string | null;
  email: string | null;
  student_id: string | null;
}

interface Appointment {
  id: string;
  student_id: string;
  scheduled_at: string;
  duration_minutes: number;
  reason: string | null;
  status: string;
  provider_name: string | null;
  location: string | null;
  admin_notes: string | null;
  created_at: string;
  profile?: StudentOption | null;
}

interface VisitLog {
  id: string;
  student_id: string;
  appointment_id: string | null;
  visit_date: string;
  chief_complaint: string | null;
  diagnosis: string | null;
  treatment: string | null;
  prescriptions: string | null;
  vitals: any;
  follow_up_date: string | null;
  provider_name: string | null;
  visible_to_student: boolean;
  student_summary: string | null;
  created_at: string;
  profile?: StudentOption | null;
}

const apptEmpty = {
  student_id: "",
  scheduled_at: "",
  duration_minutes: 30,
  reason: "",
  status: "scheduled",
  provider_name: "",
  location: "Health Center",
  admin_notes: "",
};

const visitEmpty = {
  student_id: "",
  appointment_id: "",
  visit_date: "",
  chief_complaint: "",
  diagnosis: "",
  treatment: "",
  prescriptions: "",
  vitals_bp: "",
  vitals_temp: "",
  vitals_pulse: "",
  vitals_notes: "",
  follow_up_date: "",
  provider_name: "",
  visible_to_student: false,
  student_summary: "",
};

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  no_show: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

const AdminHealth = () => {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [visits, setVisits] = useState<VisitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [apptOpen, setApptOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [apptEditId, setApptEditId] = useState<string | null>(null);
  const [visitEditId, setVisitEditId] = useState<string | null>(null);
  const [apptForm, setApptForm] = useState({ ...apptEmpty });
  const [visitForm, setVisitForm] = useState({ ...visitEmpty });
  const [search, setSearch] = useState("");

  const studentMap = useMemo(() => {
    const m: Record<string, StudentOption> = {};
    students.forEach((s) => (m[s.user_id] = s));
    return m;
  }, [students]);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: studs }, { data: appts }, { data: vs }] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, full_name, email, student_id")
        .not("student_id", "is", null)
        .order("full_name", { ascending: true })
        .limit(1000),
      supabase
        .from("health_appointments" as any)
        .select("*")
        .order("scheduled_at", { ascending: false }),
      supabase
        .from("health_visit_logs" as any)
        .select("*")
        .order("visit_date", { ascending: false }),
    ]);
    setStudents((studs as StudentOption[]) || []);
    setAppointments((appts as any) || []);
    setVisits((vs as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const resetAppt = () => {
    setApptForm({ ...apptEmpty });
    setApptEditId(null);
  };

  const resetVisit = () => {
    setVisitForm({ ...visitEmpty });
    setVisitEditId(null);
  };

  const saveAppointment = async () => {
    if (!apptForm.student_id || !apptForm.scheduled_at) {
      toast.error("Pick a student and a date/time");
      return;
    }
    const payload = {
      student_id: apptForm.student_id,
      scheduled_at: new Date(apptForm.scheduled_at).toISOString(),
      duration_minutes: Number(apptForm.duration_minutes) || 30,
      reason: apptForm.reason || null,
      status: apptForm.status,
      provider_name: apptForm.provider_name || null,
      location: apptForm.location || null,
      admin_notes: apptForm.admin_notes || null,
    };
    const { data: userData } = await supabase.auth.getUser();
    if (apptEditId) {
      const { error } = await supabase
        .from("health_appointments" as any)
        .update(payload)
        .eq("id", apptEditId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase
        .from("health_appointments" as any)
        .insert({ ...payload, created_by: userData.user?.id });
      if (error) return toast.error(error.message);
    }
    toast.success("Appointment saved");
    setApptOpen(false);
    resetAppt();
    loadAll();
  };

  const editAppointment = (a: Appointment) => {
    setApptEditId(a.id);
    setApptForm({
      student_id: a.student_id,
      scheduled_at: new Date(a.scheduled_at).toISOString().slice(0, 16),
      duration_minutes: a.duration_minutes,
      reason: a.reason || "",
      status: a.status,
      provider_name: a.provider_name || "",
      location: a.location || "",
      admin_notes: a.admin_notes || "",
    });
    setApptOpen(true);
  };

  const deleteAppointment = async (id: string) => {
    if (!confirm("Delete this appointment?")) return;
    const { error } = await supabase.from("health_appointments" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    loadAll();
  };

  const saveVisit = async () => {
    if (!visitForm.student_id || !visitForm.visit_date) {
      toast.error("Pick a student and visit date");
      return;
    }
    const vitals: Record<string, string> = {};
    if (visitForm.vitals_bp) vitals.blood_pressure = visitForm.vitals_bp;
    if (visitForm.vitals_temp) vitals.temperature = visitForm.vitals_temp;
    if (visitForm.vitals_pulse) vitals.pulse = visitForm.vitals_pulse;
    if (visitForm.vitals_notes) vitals.notes = visitForm.vitals_notes;

    const payload = {
      student_id: visitForm.student_id,
      appointment_id: visitForm.appointment_id || null,
      visit_date: new Date(visitForm.visit_date).toISOString(),
      chief_complaint: visitForm.chief_complaint || null,
      diagnosis: visitForm.diagnosis || null,
      treatment: visitForm.treatment || null,
      prescriptions: visitForm.prescriptions || null,
      vitals: Object.keys(vitals).length ? vitals : null,
      follow_up_date: visitForm.follow_up_date || null,
      provider_name: visitForm.provider_name || null,
      visible_to_student: visitForm.visible_to_student,
      student_summary: visitForm.student_summary || null,
    };
    const { data: userData } = await supabase.auth.getUser();
    if (visitEditId) {
      const { error } = await supabase
        .from("health_visit_logs" as any)
        .update(payload)
        .eq("id", visitEditId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase
        .from("health_visit_logs" as any)
        .insert({ ...payload, created_by: userData.user?.id });
      if (error) return toast.error(error.message);
    }
    toast.success("Visit log saved");
    setVisitOpen(false);
    resetVisit();
    loadAll();
  };

  const editVisit = (v: VisitLog) => {
    const vit = (v.vitals as any) || {};
    setVisitEditId(v.id);
    setVisitForm({
      student_id: v.student_id,
      appointment_id: v.appointment_id || "",
      visit_date: new Date(v.visit_date).toISOString().slice(0, 16),
      chief_complaint: v.chief_complaint || "",
      diagnosis: v.diagnosis || "",
      treatment: v.treatment || "",
      prescriptions: v.prescriptions || "",
      vitals_bp: vit.blood_pressure || "",
      vitals_temp: vit.temperature || "",
      vitals_pulse: vit.pulse || "",
      vitals_notes: vit.notes || "",
      follow_up_date: v.follow_up_date || "",
      provider_name: v.provider_name || "",
      visible_to_student: v.visible_to_student,
      student_summary: v.student_summary || "",
    });
    setVisitOpen(true);
  };

  const deleteVisit = async (id: string) => {
    if (!confirm("Delete this visit log?")) return;
    const { error } = await supabase.from("health_visit_logs" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    loadAll();
  };

  const filteredAppts = appointments.filter((a) => {
    if (!search) return true;
    const s = studentMap[a.student_id];
    const blob = `${s?.full_name || ""} ${s?.email || ""} ${s?.student_id || ""} ${a.reason || ""}`.toLowerCase();
    return blob.includes(search.toLowerCase());
  });

  const filteredVisits = visits.filter((v) => {
    if (!search) return true;
    const s = studentMap[v.student_id];
    const blob = `${s?.full_name || ""} ${s?.email || ""} ${s?.student_id || ""} ${v.diagnosis || ""} ${v.chief_complaint || ""}`.toLowerCase();
    return blob.includes(search.toLowerCase());
  });

  const todayAppts = appointments.filter((a) => {
    const d = new Date(a.scheduled_at);
    const now = new Date();
    return d.toDateString() === now.toDateString() && a.status === "scheduled";
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <HeartPulse className="h-7 w-7 text-rose-500" /> Health Center
            </h1>
            <p className="text-muted-foreground mt-1">
              Schedule student appointments and keep confidential medical visit records.
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={apptOpen} onOpenChange={(o) => { setApptOpen(o); if (!o) resetAppt(); }}>
              <DialogTrigger asChild>
                <Button><CalendarPlus className="h-4 w-4 mr-1" /> New Appointment</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{apptEditId ? "Edit" : "New"} Appointment</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Student</Label>
                    <Select value={apptForm.student_id} onValueChange={(v) => setApptForm({ ...apptForm, student_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {students.map((s) => (
                          <SelectItem key={s.user_id} value={s.user_id}>
                            {s.full_name || s.email} {s.student_id ? `(${s.student_id})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Date & time</Label>
                      <Input type="datetime-local" value={apptForm.scheduled_at}
                        onChange={(e) => setApptForm({ ...apptForm, scheduled_at: e.target.value })} />
                    </div>
                    <div>
                      <Label>Duration (min)</Label>
                      <Input type="number" min={5} value={apptForm.duration_minutes}
                        onChange={(e) => setApptForm({ ...apptForm, duration_minutes: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Provider</Label>
                      <Input value={apptForm.provider_name}
                        onChange={(e) => setApptForm({ ...apptForm, provider_name: e.target.value })} />
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input value={apptForm.location}
                        onChange={(e) => setApptForm({ ...apptForm, location: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Reason</Label>
                    <Input value={apptForm.reason}
                      onChange={(e) => setApptForm({ ...apptForm, reason: e.target.value })} />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={apptForm.status} onValueChange={(v) => setApptForm({ ...apptForm, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="no_show">No-show</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Admin notes (private)</Label>
                    <Textarea rows={2} value={apptForm.admin_notes}
                      onChange={(e) => setApptForm({ ...apptForm, admin_notes: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setApptOpen(false)}>Cancel</Button>
                  <Button onClick={saveAppointment}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={visitOpen} onOpenChange={(o) => { setVisitOpen(o); if (!o) resetVisit(); }}>
              <DialogTrigger asChild>
                <Button variant="secondary"><Stethoscope className="h-4 w-4 mr-1" /> New Visit Log</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{visitEditId ? "Edit" : "New"} Medical Visit Log</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Student</Label>
                      <Select value={visitForm.student_id} onValueChange={(v) => setVisitForm({ ...visitForm, student_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                        <SelectContent className="max-h-72">
                          {students.map((s) => (
                            <SelectItem key={s.user_id} value={s.user_id}>
                              {s.full_name || s.email} {s.student_id ? `(${s.student_id})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Visit date & time</Label>
                      <Input type="datetime-local" value={visitForm.visit_date}
                        onChange={(e) => setVisitForm({ ...visitForm, visit_date: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Linked appointment (optional)</Label>
                    <Select
                      value={visitForm.appointment_id || "none"}
                      onValueChange={(v) => setVisitForm({ ...visitForm, appointment_id: v === "none" ? "" : v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value="none">— None —</SelectItem>
                        {appointments
                          .filter((a) => !visitForm.student_id || a.student_id === visitForm.student_id)
                          .map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {new Date(a.scheduled_at).toLocaleString()} — {a.reason || "appointment"}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Chief complaint</Label>
                    <Input value={visitForm.chief_complaint}
                      onChange={(e) => setVisitForm({ ...visitForm, chief_complaint: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Diagnosis</Label>
                      <Textarea rows={2} value={visitForm.diagnosis}
                        onChange={(e) => setVisitForm({ ...visitForm, diagnosis: e.target.value })} />
                    </div>
                    <div>
                      <Label>Treatment</Label>
                      <Textarea rows={2} value={visitForm.treatment}
                        onChange={(e) => setVisitForm({ ...visitForm, treatment: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Prescriptions</Label>
                    <Textarea rows={2} value={visitForm.prescriptions}
                      onChange={(e) => setVisitForm({ ...visitForm, prescriptions: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <Label className="text-xs">BP</Label>
                      <Input placeholder="120/80" value={visitForm.vitals_bp}
                        onChange={(e) => setVisitForm({ ...visitForm, vitals_bp: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Temp</Label>
                      <Input placeholder="36.6" value={visitForm.vitals_temp}
                        onChange={(e) => setVisitForm({ ...visitForm, vitals_temp: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Pulse</Label>
                      <Input placeholder="72" value={visitForm.vitals_pulse}
                        onChange={(e) => setVisitForm({ ...visitForm, vitals_pulse: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Vitals notes</Label>
                      <Input value={visitForm.vitals_notes}
                        onChange={(e) => setVisitForm({ ...visitForm, vitals_notes: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Follow-up date</Label>
                      <Input type="date" value={visitForm.follow_up_date}
                        onChange={(e) => setVisitForm({ ...visitForm, follow_up_date: e.target.value })} />
                    </div>
                    <div>
                      <Label>Provider</Label>
                      <Input value={visitForm.provider_name}
                        onChange={(e) => setVisitForm({ ...visitForm, provider_name: e.target.value })} />
                    </div>
                  </div>
                  <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Lock className="h-4 w-4" /> Share summary with student
                      </Label>
                      <Switch
                        checked={visitForm.visible_to_student}
                        onCheckedChange={(v) => setVisitForm({ ...visitForm, visible_to_student: v })}
                      />
                    </div>
                    {visitForm.visible_to_student && (
                      <Textarea
                        rows={3}
                        placeholder="Patient-facing summary (no internal clinical notes)"
                        value={visitForm.student_summary}
                        onChange={(e) => setVisitForm({ ...visitForm, student_summary: e.target.value })}
                      />
                    )}
                    <p className="text-xs text-muted-foreground">
                      Clinical fields stay private to health center admins. Only the summary is shown to the student when sharing is on.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setVisitOpen(false)}>Cancel</Button>
                  <Button onClick={saveVisit}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Today's appointments</CardTitle></CardHeader>
            <CardContent className="text-3xl font-bold">{todayAppts.length}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total appointments</CardTitle></CardHeader>
            <CardContent className="text-3xl font-bold">{appointments.length}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Visit records</CardTitle></CardHeader>
            <CardContent className="text-3xl font-bold">{visits.length}</CardContent>
          </Card>
        </div>

        <Input
          placeholder="Search by student, ID, reason, diagnosis…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />

        <Tabs defaultValue="appointments">
          <TabsList>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="visits">Visit Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="space-y-3">
            {loading && <p className="text-muted-foreground">Loading…</p>}
            {!loading && filteredAppts.length === 0 && (
              <Card><CardContent className="py-10 text-center text-muted-foreground">No appointments.</CardContent></Card>
            )}
            {filteredAppts.map((a) => {
              const s = studentMap[a.student_id];
              return (
                <Card key={a.id}>
                  <CardContent className="py-4 flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{s?.full_name || "Unknown student"}</span>
                        {s?.student_id && <Badge variant="outline">{s.student_id}</Badge>}
                        <Badge className={statusColors[a.status] || ""}>{a.status.replace("_", " ")}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(a.scheduled_at).toLocaleString()} · {a.duration_minutes} min
                        {a.location ? ` · ${a.location}` : ""}
                        {a.provider_name ? ` · ${a.provider_name}` : ""}
                      </div>
                      {a.reason && <div className="text-sm">Reason: {a.reason}</div>}
                      {a.admin_notes && (
                        <div className="text-xs text-muted-foreground italic flex items-center gap-1">
                          <Lock className="h-3 w-3" /> {a.admin_notes}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => editAppointment(a)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteAppointment(a.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="visits" className="space-y-3">
            {loading && <p className="text-muted-foreground">Loading…</p>}
            {!loading && filteredVisits.length === 0 && (
              <Card><CardContent className="py-10 text-center text-muted-foreground">No visit logs.</CardContent></Card>
            )}
            {filteredVisits.map((v) => {
              const s = studentMap[v.student_id];
              const vit = (v.vitals as any) || {};
              return (
                <Card key={v.id}>
                  <CardContent className="py-4 space-y-2">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{s?.full_name || "Unknown student"}</span>
                          {s?.student_id && <Badge variant="outline">{s.student_id}</Badge>}
                          {v.visible_to_student
                            ? <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Shared with student</Badge>
                            : <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" /> Confidential</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(v.visit_date).toLocaleString()}
                          {v.provider_name ? ` · ${v.provider_name}` : ""}
                          {v.follow_up_date ? ` · Follow-up: ${v.follow_up_date}` : ""}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => editVisit(v)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => deleteVisit(v.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      {v.chief_complaint && <div><span className="font-medium">Complaint:</span> {v.chief_complaint}</div>}
                      {v.diagnosis && <div><span className="font-medium">Diagnosis:</span> {v.diagnosis}</div>}
                      {v.treatment && <div><span className="font-medium">Treatment:</span> {v.treatment}</div>}
                      {v.prescriptions && <div><span className="font-medium">Rx:</span> {v.prescriptions}</div>}
                    </div>
                    {(vit.blood_pressure || vit.temperature || vit.pulse || vit.notes) && (
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                        {vit.blood_pressure && <span>BP {vit.blood_pressure}</span>}
                        {vit.temperature && <span>Temp {vit.temperature}</span>}
                        {vit.pulse && <span>Pulse {vit.pulse}</span>}
                        {vit.notes && <span>{vit.notes}</span>}
                      </div>
                    )}
                    {v.visible_to_student && v.student_summary && (
                      <div className="rounded-md bg-muted/40 p-2 text-sm">
                        <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                          <FileText className="h-3 w-3" /> Student-facing summary
                        </div>
                        {v.student_summary}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminHealth;
