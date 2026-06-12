import { useEffect, useState } from "react";
import StudentLayout from "@/components/StudentLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, MapPin, Calendar, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function StudentInternships() {
  const { user } = useAuth();
  const [positions, setPositions] = useState<any[]>([]);
  const [myApps, setMyApps] = useState<any[]>([]);
  const [myPlacements, setMyPlacements] = useState<any[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");

  const load = async () => {
    if (!user) return;
    const [{ data: p }, { data: a }, { data: pl }] = await Promise.all([
      supabase.from("internship_positions").select("*, internship_companies(name, industry, website, logo_url)").eq("status","open").order("application_deadline", { ascending: true }),
      supabase.from("internship_applications").select("*, internship_positions(title, internship_companies(name))").eq("student_id", user.id).order("created_at", { ascending: false }),
      supabase.from("internship_placements").select("*, internship_positions(title), internship_companies(name)").eq("student_id", user.id),
    ]);
    setPositions((p as any) || []);
    setMyApps((a as any) || []);
    setMyPlacements((pl as any) || []);
  };
  useEffect(() => { load(); }, [user?.id]);

  const apply = async () => {
    if (!openId || !user) return;
    const { error } = await supabase.from("internship_applications").insert({
      position_id: openId, student_id: user.id,
      cover_letter: coverLetter || null, resume_url: resumeUrl || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Application submitted");
    setOpenId(null); setCoverLetter(""); setResumeUrl("");
    load();
  };

  const withdraw = async (id: string) => {
    if (!confirm("Withdraw application?")) return;
    const { error } = await supabase.from("internship_applications").update({ status: "withdrawn" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Withdrawn"); load();
  };

  const appliedIds = new Set(myApps.filter(a => a.status !== "withdrawn").map(a => a.position_id));

  const badge = (s: string) => {
    const cls: Record<string,string> = {
      pending:"bg-yellow-500/15 text-yellow-700", reviewing:"bg-blue-500/15 text-blue-700",
      accepted:"bg-green-500/15 text-green-700", rejected:"bg-red-500/15 text-red-700",
      withdrawn:"bg-muted text-muted-foreground", active:"bg-green-500/15 text-green-700",
      completed:"bg-blue-500/15 text-blue-700", terminated:"bg-red-500/15 text-red-700",
    };
    return <Badge variant="outline" className={cls[s] || ""}>{s}</Badge>;
  };

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2"><Briefcase className="h-6 w-6 text-primary"/></div>
          <div>
            <h1 className="text-2xl font-display font-semibold">Internships</h1>
            <p className="text-sm text-muted-foreground">Browse partner companies and apply for open positions.</p>
          </div>
        </div>

        <Tabs defaultValue="browse">
          <TabsList>
            <TabsTrigger value="browse">Open positions</TabsTrigger>
            <TabsTrigger value="applications">My applications ({myApps.length})</TabsTrigger>
            <TabsTrigger value="placements">My placements ({myPlacements.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="mt-4 space-y-3">
            {positions.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">No open positions right now.</CardContent></Card>}
            {positions.map(p => (
              <Card key={p.id}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">{p.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4"/>{p.internship_companies?.name}
                        {p.location && <><MapPin className="h-4 w-4 ml-2"/>{p.location}</>}
                        <Badge variant="outline" className="ml-1 capitalize">{p.work_type}</Badge>
                      </div>
                      {p.application_deadline && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3"/>Apply by {p.application_deadline}</div>}
                    </div>
                    <Button
                      onClick={() => setOpenId(p.id)}
                      disabled={appliedIds.has(p.id)}
                    >{appliedIds.has(p.id) ? "Applied" : "Apply"}</Button>
                  </div>
                  {p.description && <p className="mt-3 text-sm whitespace-pre-wrap">{p.description}</p>}
                  {p.requirements && <p className="mt-2 text-sm text-muted-foreground"><strong>Requirements:</strong> {p.requirements}</p>}
                  {p.duration && <p className="mt-1 text-xs text-muted-foreground">Duration: {p.duration}</p>}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="applications" className="mt-4 space-y-3">
            {myApps.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">You haven't applied yet.</CardContent></Card>}
            {myApps.map(a => (
              <Card key={a.id}>
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{a.internship_positions?.title}</div>
                    <div className="text-sm text-muted-foreground">{a.internship_positions?.internship_companies?.name} · Submitted {new Date(a.created_at).toLocaleDateString()}</div>
                    {a.admin_notes && <div className="text-xs mt-1 text-muted-foreground">Note: {a.admin_notes}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    {badge(a.status)}
                    {a.status === "pending" && <Button size="sm" variant="outline" onClick={() => withdraw(a.id)}>Withdraw</Button>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="placements" className="mt-4 space-y-3">
            {myPlacements.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">No placements yet.</CardContent></Card>}
            {myPlacements.map(p => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{p.internship_positions?.title}</div>
                      <div className="text-sm text-muted-foreground">{p.internship_companies?.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{p.start_date || "?"} → {p.end_date || "?"} · Supervisor: {p.supervisor_name || "—"}</div>
                    </div>
                    <div className="text-right space-y-1">
                      {badge(p.status)}
                      {p.evaluation_score != null && <div className="text-sm">Score: <strong>{p.evaluation_score}</strong></div>}
                    </div>
                  </div>
                  {p.evaluation_notes && <p className="mt-2 text-sm">{p.evaluation_notes}</p>}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!openId} onOpenChange={o => !o && setOpenId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Apply for position</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Cover letter</Label><Textarea rows={6} value={coverLetter} onChange={e=>setCoverLetter(e.target.value)} placeholder="Tell the employer why you're a great fit..."/></div>
            <div><Label>Resume URL (optional)</Label><Input value={resumeUrl} onChange={e=>setResumeUrl(e.target.value)} placeholder="https://..."/></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setOpenId(null)}>Cancel</Button><Button onClick={apply}>Submit application</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </StudentLayout>
  );
}
