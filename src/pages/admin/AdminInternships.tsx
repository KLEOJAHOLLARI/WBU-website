import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Briefcase, Building2, Users, GraduationCap, Plus, Pencil, Trash2, Check, X } from "lucide-react";

type Company = {
  id: string; name: string; industry: string | null; website: string | null;
  contact_name: string | null; contact_email: string | null; contact_phone: string | null;
  address: string | null; description: string | null; status: string;
};
type Position = {
  id: string; company_id: string; title: string; description: string | null;
  location: string | null; work_type: string | null; duration: string | null;
  capacity: number; program: string | null; requirements: string | null;
  application_deadline: string | null; start_date: string | null; end_date: string | null;
  status: string; internship_companies?: { name: string } | null;
};
type Application = {
  id: string; position_id: string; student_id: string; cover_letter: string | null;
  resume_url: string | null; status: string; admin_notes: string | null; created_at: string;
  internship_positions?: { title: string; internship_companies?: { name: string } | null } | null;
  profiles?: { full_name: string | null; email: string | null; student_id: string | null } | null;
};
type Placement = {
  id: string; student_id: string; position_id: string; company_id: string;
  start_date: string | null; end_date: string | null; supervisor_name: string | null;
  supervisor_email: string | null; status: string; evaluation_score: number | null;
  evaluation_notes: string | null;
  internship_positions?: { title: string } | null;
  internship_companies?: { name: string } | null;
  profiles?: { full_name: string | null; student_id: string | null } | null;
};

const emptyCompany = { name: "", industry: "", website: "", contact_name: "", contact_email: "", contact_phone: "", address: "", description: "", status: "active" };
const emptyPosition = { company_id: "", title: "", description: "", location: "", work_type: "onsite", duration: "", capacity: 1, program: "", requirements: "", application_deadline: "", start_date: "", end_date: "", status: "open" };
const emptyPlacement = { student_id: "", position_id: "", company_id: "", start_date: "", end_date: "", supervisor_name: "", supervisor_email: "", status: "active", evaluation_score: "", evaluation_notes: "" };

export default function AdminInternships() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [students, setStudents] = useState<{ user_id: string; full_name: string | null; student_id: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const [companyOpen, setCompanyOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState<any>(emptyCompany);
  const [companyEditId, setCompanyEditId] = useState<string | null>(null);

  const [positionOpen, setPositionOpen] = useState(false);
  const [positionForm, setPositionForm] = useState<any>(emptyPosition);
  const [positionEditId, setPositionEditId] = useState<string | null>(null);

  const [placementOpen, setPlacementOpen] = useState(false);
  const [placementForm, setPlacementForm] = useState<any>(emptyPlacement);
  const [placementEditId, setPlacementEditId] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: c }, { data: p }, { data: a }, { data: pl }, { data: s }] = await Promise.all([
      supabase.from("internship_companies").select("*").order("name"),
      supabase.from("internship_positions").select("*, internship_companies(name)").order("created_at", { ascending: false }),
      supabase.from("internship_applications").select("*, internship_positions(title, internship_companies(name)), profiles!internship_applications_student_id_fkey(full_name, email, student_id)").order("created_at", { ascending: false }),
      supabase.from("internship_placements").select("*, internship_positions(title), internship_companies(name), profiles!internship_placements_student_id_fkey(full_name, student_id)").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name, student_id").not("student_id", "is", null).order("full_name"),
    ]);
    setCompanies((c as any) || []);
    setPositions((p as any) || []);
    setApplications((a as any) || []);
    setPlacements((pl as any) || []);
    setStudents((s as any) || []);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  // -- Companies --
  const openCompany = (c?: Company) => {
    if (c) { setCompanyEditId(c.id); setCompanyForm({ ...emptyCompany, ...c }); }
    else { setCompanyEditId(null); setCompanyForm(emptyCompany); }
    setCompanyOpen(true);
  };
  const saveCompany = async () => {
    if (!companyForm.name) return toast.error("Name required");
    const payload = { ...companyForm };
    Object.keys(payload).forEach(k => payload[k] === "" && (payload[k] = null));
    payload.name = companyForm.name;
    payload.status = companyForm.status || "active";
    const { error } = companyEditId
      ? await supabase.from("internship_companies").update(payload).eq("id", companyEditId)
      : await supabase.from("internship_companies").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Company saved");
    setCompanyOpen(false); loadAll();
  };
  const deleteCompany = async (id: string) => {
    if (!confirm("Delete company and all its positions?")) return;
    const { error } = await supabase.from("internship_companies").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); loadAll();
  };

  // -- Positions --
  const openPosition = (p?: Position) => {
    if (p) { setPositionEditId(p.id); setPositionForm({ ...emptyPosition, ...p, application_deadline: p.application_deadline || "", start_date: p.start_date || "", end_date: p.end_date || "" }); }
    else { setPositionEditId(null); setPositionForm(emptyPosition); }
    setPositionOpen(true);
  };
  const savePosition = async () => {
    if (!positionForm.company_id || !positionForm.title) return toast.error("Company and title required");
    const payload: any = { ...positionForm, capacity: Number(positionForm.capacity) || 1 };
    ["description","location","duration","program","requirements","application_deadline","start_date","end_date"].forEach(k => payload[k] === "" && (payload[k] = null));
    const { error } = positionEditId
      ? await supabase.from("internship_positions").update(payload).eq("id", positionEditId)
      : await supabase.from("internship_positions").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Position saved");
    setPositionOpen(false); loadAll();
  };
  const deletePosition = async (id: string) => {
    if (!confirm("Delete position?")) return;
    const { error } = await supabase.from("internship_positions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); loadAll();
  };

  // -- Applications --
  const updateApplicationStatus = async (id: string, status: string, notes?: string) => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("internship_applications").update({
      status, admin_notes: notes ?? undefined, reviewed_by: u.user?.id, reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    if (status === "accepted") {
      const app = applications.find(a => a.id === id);
      const pos = positions.find(p => p.id === app?.position_id);
      if (app && pos) {
        await supabase.from("internship_placements").insert({
          application_id: app.id, student_id: app.student_id,
          position_id: pos.id, company_id: pos.company_id,
          start_date: pos.start_date, end_date: pos.end_date, status: "active",
        });
      }
    }
    loadAll();
  };

  // -- Placements --
  const openPlacement = (p?: Placement) => {
    if (p) { setPlacementEditId(p.id); setPlacementForm({ ...emptyPlacement, ...p, evaluation_score: p.evaluation_score?.toString() || "", start_date: p.start_date || "", end_date: p.end_date || "" }); }
    else { setPlacementEditId(null); setPlacementForm(emptyPlacement); }
    setPlacementOpen(true);
  };
  const savePlacement = async () => {
    if (!placementForm.student_id || !placementForm.position_id) return toast.error("Student and position required");
    const pos = positions.find(p => p.id === placementForm.position_id);
    const payload: any = { ...placementForm, company_id: pos?.company_id, evaluation_score: placementForm.evaluation_score === "" ? null : Number(placementForm.evaluation_score) };
    ["start_date","end_date","supervisor_name","supervisor_email","evaluation_notes"].forEach(k => payload[k] === "" && (payload[k] = null));
    const { error } = placementEditId
      ? await supabase.from("internship_placements").update(payload).eq("id", placementEditId)
      : await supabase.from("internship_placements").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Placement saved");
    setPlacementOpen(false); loadAll();
  };
  const deletePlacement = async (id: string) => {
    if (!confirm("Delete placement?")) return;
    const { error } = await supabase.from("internship_placements").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); loadAll();
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-500/15 text-yellow-700",
      reviewing: "bg-blue-500/15 text-blue-700",
      accepted: "bg-green-500/15 text-green-700",
      rejected: "bg-red-500/15 text-red-700",
      withdrawn: "bg-muted text-muted-foreground",
      active: "bg-green-500/15 text-green-700",
      completed: "bg-blue-500/15 text-blue-700",
      terminated: "bg-red-500/15 text-red-700",
      open: "bg-green-500/15 text-green-700",
      closed: "bg-muted text-muted-foreground",
      draft: "bg-yellow-500/15 text-yellow-700",
      inactive: "bg-muted text-muted-foreground",
    };
    return <Badge variant="outline" className={map[s] || ""}>{s}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2"><Briefcase className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-display font-semibold">Internships & Placements</h1>
            <p className="text-sm text-muted-foreground">Manage partner companies, open roles, applications, and placements.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Companies</span><Building2 className="h-4 w-4 text-muted-foreground"/></div><p className="text-2xl font-semibold mt-1">{companies.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Open positions</span><Briefcase className="h-4 w-4 text-muted-foreground"/></div><p className="text-2xl font-semibold mt-1">{positions.filter(p=>p.status==='open').length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Pending applications</span><Users className="h-4 w-4 text-muted-foreground"/></div><p className="text-2xl font-semibold mt-1">{applications.filter(a=>a.status==='pending').length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Active placements</span><GraduationCap className="h-4 w-4 text-muted-foreground"/></div><p className="text-2xl font-semibold mt-1">{placements.filter(p=>p.status==='active').length}</p></CardContent></Card>
        </div>

        <Tabs defaultValue="companies">
          <TabsList>
            <TabsTrigger value="companies">Companies</TabsTrigger>
            <TabsTrigger value="positions">Positions</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="placements">Placements</TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Partner Companies</CardTitle>
                <Button onClick={() => openCompany()}><Plus className="h-4 w-4 mr-1"/>Add Company</Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Industry</TableHead><TableHead>Contact</TableHead><TableHead>Status</TableHead><TableHead/></TableRow></TableHeader>
                  <TableBody>
                    {companies.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}<div className="text-xs text-muted-foreground">{c.website}</div></TableCell>
                        <TableCell>{c.industry || "—"}</TableCell>
                        <TableCell>{c.contact_name || "—"}<div className="text-xs text-muted-foreground">{c.contact_email}</div></TableCell>
                        <TableCell>{statusBadge(c.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openCompany(c)}><Pencil className="h-4 w-4"/></Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteCompany(c.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {companies.length === 0 && !loading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No companies yet</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="positions" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Internship Positions</CardTitle>
                <Button onClick={() => openPosition()} disabled={companies.length===0}><Plus className="h-4 w-4 mr-1"/>Add Position</Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Company</TableHead><TableHead>Type</TableHead><TableHead>Capacity</TableHead><TableHead>Deadline</TableHead><TableHead>Status</TableHead><TableHead/></TableRow></TableHeader>
                  <TableBody>
                    {positions.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.title}<div className="text-xs text-muted-foreground">{p.location}</div></TableCell>
                        <TableCell>{p.internship_companies?.name || "—"}</TableCell>
                        <TableCell className="capitalize">{p.work_type}</TableCell>
                        <TableCell>{p.capacity}</TableCell>
                        <TableCell>{p.application_deadline || "—"}</TableCell>
                        <TableCell>{statusBadge(p.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openPosition(p)}><Pencil className="h-4 w-4"/></Button>
                          <Button variant="ghost" size="sm" onClick={() => deletePosition(p.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {positions.length === 0 && !loading && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No positions yet</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Student Applications</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Position</TableHead><TableHead>Submitted</TableHead><TableHead>Status</TableHead><TableHead/></TableRow></TableHeader>
                  <TableBody>
                    {applications.map(a => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <div className="font-medium">{a.profiles?.full_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{a.profiles?.student_id} · {a.profiles?.email}</div>
                        </TableCell>
                        <TableCell>{a.internship_positions?.title}<div className="text-xs text-muted-foreground">{a.internship_positions?.internship_companies?.name}</div></TableCell>
                        <TableCell className="text-sm">{new Date(a.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{statusBadge(a.status)}</TableCell>
                        <TableCell className="text-right">
                          {a.status === "pending" && <>
                            <Button size="sm" variant="outline" onClick={() => updateApplicationStatus(a.id, "reviewing")}>Review</Button>
                          </>}
                          {["pending","reviewing"].includes(a.status) && <>
                            <Button size="sm" variant="ghost" className="text-green-600" onClick={() => updateApplicationStatus(a.id, "accepted")}><Check className="h-4 w-4"/></Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => updateApplicationStatus(a.id, "rejected")}><X className="h-4 w-4"/></Button>
                          </>}
                        </TableCell>
                      </TableRow>
                    ))}
                    {applications.length === 0 && !loading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No applications yet</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="placements" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Active Placements</CardTitle>
                <Button onClick={() => openPlacement()} disabled={positions.length===0 || students.length===0}><Plus className="h-4 w-4 mr-1"/>Add Placement</Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Position</TableHead><TableHead>Company</TableHead><TableHead>Period</TableHead><TableHead>Supervisor</TableHead><TableHead>Score</TableHead><TableHead>Status</TableHead><TableHead/></TableRow></TableHeader>
                  <TableBody>
                    {placements.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.profiles?.full_name}<div className="text-xs text-muted-foreground">{p.profiles?.student_id}</div></TableCell>
                        <TableCell>{p.internship_positions?.title}</TableCell>
                        <TableCell>{p.internship_companies?.name}</TableCell>
                        <TableCell className="text-sm">{p.start_date || "?"} → {p.end_date || "?"}</TableCell>
                        <TableCell className="text-sm">{p.supervisor_name || "—"}</TableCell>
                        <TableCell>{p.evaluation_score ?? "—"}</TableCell>
                        <TableCell>{statusBadge(p.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openPlacement(p)}><Pencil className="h-4 w-4"/></Button>
                          <Button variant="ghost" size="sm" onClick={() => deletePlacement(p.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {placements.length === 0 && !loading && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No placements yet</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Company Dialog */}
      <Dialog open={companyOpen} onOpenChange={setCompanyOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{companyEditId ? "Edit" : "Add"} Company</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2"><Label>Name *</Label><Input value={companyForm.name} onChange={e=>setCompanyForm({...companyForm, name:e.target.value})}/></div>
            <div><Label>Industry</Label><Input value={companyForm.industry} onChange={e=>setCompanyForm({...companyForm, industry:e.target.value})}/></div>
            <div><Label>Website</Label><Input value={companyForm.website} onChange={e=>setCompanyForm({...companyForm, website:e.target.value})}/></div>
            <div><Label>Contact name</Label><Input value={companyForm.contact_name} onChange={e=>setCompanyForm({...companyForm, contact_name:e.target.value})}/></div>
            <div><Label>Contact email</Label><Input type="email" value={companyForm.contact_email} onChange={e=>setCompanyForm({...companyForm, contact_email:e.target.value})}/></div>
            <div><Label>Contact phone</Label><Input value={companyForm.contact_phone} onChange={e=>setCompanyForm({...companyForm, contact_phone:e.target.value})}/></div>
            <div><Label>Status</Label>
              <Select value={companyForm.status} onValueChange={v=>setCompanyForm({...companyForm, status:v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label>Address</Label><Input value={companyForm.address} onChange={e=>setCompanyForm({...companyForm, address:e.target.value})}/></div>
            <div className="md:col-span-2"><Label>Description</Label><Textarea value={companyForm.description} onChange={e=>setCompanyForm({...companyForm, description:e.target.value})}/></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setCompanyOpen(false)}>Cancel</Button><Button onClick={saveCompany}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Position Dialog */}
      <Dialog open={positionOpen} onOpenChange={setPositionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{positionEditId ? "Edit" : "Add"} Position</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Company *</Label>
              <Select value={positionForm.company_id} onValueChange={v=>setPositionForm({...positionForm, company_id:v})}>
                <SelectTrigger><SelectValue placeholder="Select company"/></SelectTrigger>
                <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Title *</Label><Input value={positionForm.title} onChange={e=>setPositionForm({...positionForm, title:e.target.value})}/></div>
            <div><Label>Location</Label><Input value={positionForm.location} onChange={e=>setPositionForm({...positionForm, location:e.target.value})}/></div>
            <div><Label>Work type</Label>
              <Select value={positionForm.work_type} onValueChange={v=>setPositionForm({...positionForm, work_type:v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="onsite">On-site</SelectItem><SelectItem value="remote">Remote</SelectItem><SelectItem value="hybrid">Hybrid</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Duration</Label><Input placeholder="e.g. 3 months" value={positionForm.duration} onChange={e=>setPositionForm({...positionForm, duration:e.target.value})}/></div>
            <div><Label>Capacity</Label><Input type="number" min={1} value={positionForm.capacity} onChange={e=>setPositionForm({...positionForm, capacity:e.target.value})}/></div>
            <div><Label>Target program</Label><Input value={positionForm.program} onChange={e=>setPositionForm({...positionForm, program:e.target.value})}/></div>
            <div><Label>Application deadline</Label><Input type="date" value={positionForm.application_deadline} onChange={e=>setPositionForm({...positionForm, application_deadline:e.target.value})}/></div>
            <div><Label>Start date</Label><Input type="date" value={positionForm.start_date} onChange={e=>setPositionForm({...positionForm, start_date:e.target.value})}/></div>
            <div><Label>End date</Label><Input type="date" value={positionForm.end_date} onChange={e=>setPositionForm({...positionForm, end_date:e.target.value})}/></div>
            <div><Label>Status</Label>
              <Select value={positionForm.status} onValueChange={v=>setPositionForm({...positionForm, status:v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="closed">Closed</SelectItem><SelectItem value="draft">Draft</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label>Description</Label><Textarea value={positionForm.description} onChange={e=>setPositionForm({...positionForm, description:e.target.value})}/></div>
            <div className="md:col-span-2"><Label>Requirements</Label><Textarea value={positionForm.requirements} onChange={e=>setPositionForm({...positionForm, requirements:e.target.value})}/></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setPositionOpen(false)}>Cancel</Button><Button onClick={savePosition}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Placement Dialog */}
      <Dialog open={placementOpen} onOpenChange={setPlacementOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{placementEditId ? "Edit" : "Add"} Placement</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Student *</Label>
              <Select value={placementForm.student_id} onValueChange={v=>setPlacementForm({...placementForm, student_id:v})}>
                <SelectTrigger><SelectValue placeholder="Select student"/></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.user_id} value={s.user_id}>{s.full_name} ({s.student_id})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Position *</Label>
              <Select value={placementForm.position_id} onValueChange={v=>setPlacementForm({...placementForm, position_id:v})}>
                <SelectTrigger><SelectValue placeholder="Select position"/></SelectTrigger>
                <SelectContent>{positions.map(p => <SelectItem key={p.id} value={p.id}>{p.title} — {p.internship_companies?.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Start date</Label><Input type="date" value={placementForm.start_date} onChange={e=>setPlacementForm({...placementForm, start_date:e.target.value})}/></div>
            <div><Label>End date</Label><Input type="date" value={placementForm.end_date} onChange={e=>setPlacementForm({...placementForm, end_date:e.target.value})}/></div>
            <div><Label>Supervisor name</Label><Input value={placementForm.supervisor_name} onChange={e=>setPlacementForm({...placementForm, supervisor_name:e.target.value})}/></div>
            <div><Label>Supervisor email</Label><Input type="email" value={placementForm.supervisor_email} onChange={e=>setPlacementForm({...placementForm, supervisor_email:e.target.value})}/></div>
            <div><Label>Status</Label>
              <Select value={placementForm.status} onValueChange={v=>setPlacementForm({...placementForm, status:v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="terminated">Terminated</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Evaluation score (0-100)</Label><Input type="number" min={0} max={100} value={placementForm.evaluation_score} onChange={e=>setPlacementForm({...placementForm, evaluation_score:e.target.value})}/></div>
            <div className="md:col-span-2"><Label>Evaluation notes</Label><Textarea value={placementForm.evaluation_notes} onChange={e=>setPlacementForm({...placementForm, evaluation_notes:e.target.value})}/></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setPlacementOpen(false)}>Cancel</Button><Button onClick={savePlacement}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
