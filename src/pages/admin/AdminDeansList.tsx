import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Award, Trophy, Sparkles, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { downloadDeansListCertificate } from "@/lib/deansListCertificate";

const AdminDeansList = () => {
  const qc = useQueryClient();
  const [threshold, setThreshold] = useState<number>(9.0);
  const [minCourses, setMinCourses] = useState<number>(3);
  const [semesterId, setSemesterId] = useState<string>("");
  const [program, setProgram] = useState<string>("all");
  const [listTitle, setListTitle] = useState<string>("President's Honor List");
  const [generating, setGenerating] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["deans-list-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("system_settings").select("value").eq("key", "deans_list").maybeSingle();
      const v: any = data?.value || {};
      setThreshold(Number(v.threshold_gpa ?? 9.0));
      setMinCourses(Number(v.min_courses ?? 3));
      return v;
    },
  });

  const { data: semesters = [] } = useQuery({
    queryKey: ["all-semesters"],
    queryFn: async () => {
      const { data } = await supabase.from("academic_semesters").select("id, name, is_current").order("start_date", { ascending: false });
      const list = data || [];
      const cur = list.find((s: any) => s.is_current) || list[0];
      if (cur && !semesterId) setSemesterId(cur.id);
      return list;
    },
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["distinct-programs"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("program");
      const set = new Set<string>();
      (data || []).forEach((r: any) => r.program && set.add(r.program));
      return Array.from(set).sort();
    },
  });

  const { data: snapshot, isLoading: loadingSnap, refetch } = useQuery({
    queryKey: ["deans-snapshot", semesterId, program],
    queryFn: async () => {
      if (!semesterId) return null;
      let q = supabase.from("deans_list_snapshots").select("*").eq("semester_id", semesterId);
      if (program === "all") q = q.is("program", null); else q = q.eq("program", program);
      const { data } = await q.maybeSingle();
      return data;
    },
    enabled: !!semesterId,
  });

  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ["deans-entries", snapshot?.id],
    queryFn: async () => {
      if (!snapshot?.id) return [];
      const { data } = await supabase.from("deans_list_entries").select("*").eq("snapshot_id", snapshot.id).order("rank");
      return data || [];
    },
    enabled: !!snapshot?.id,
  });

  const semesterName = useMemo(
    () => semesters.find((s: any) => s.id === semesterId)?.name || "",
    [semesters, semesterId]
  );

  const saveSettings = async () => {
    const { error } = await supabase.from("system_settings").upsert(
      { key: "deans_list", value: { threshold_gpa: threshold, min_courses: minCourses } },
      { onConflict: "key" }
    );
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["deans-list-settings"] });
  };

  const generate = async () => {
    if (!semesterId) return toast.error("Pick a semester");
    setGenerating(true);
    const { data, error } = await supabase.rpc("generate_deans_list", {
      _semester_id: semesterId,
      _program: program === "all" ? null : program,
      _threshold: threshold,
      _min_courses: minCourses,
    });
    setGenerating(false);
    if (error) return toast.error(error.message);
    const res: any = data;
    toast.success(`Generated — ${res?.count ?? 0} student(s) qualified`);
    qc.invalidateQueries({ queryKey: ["deans-snapshot"] });
    qc.invalidateQueries({ queryKey: ["deans-entries"] });
  };

  const togglePublish = async (next: boolean) => {
    if (!snapshot?.id) return;
    const { error } = await supabase
      .from("deans_list_snapshots")
      .update({ is_published: next, published_at: next ? new Date().toISOString() : null })
      .eq("id", snapshot.id);
    if (error) return toast.error(error.message);
    toast.success(next ? "Published publicly" : "Unpublished");
    refetch();
  };

  const exportCert = async (e: any) => {
    await downloadDeansListCertificate({
      fullName: e.full_name,
      program: e.program,
      semesterName,
      gpaAlbanian: Number(e.gpa_albanian),
      gpa4: Number(e.gpa_4),
      rank: e.rank,
      certificateCode: e.certificate_code,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Trophy className="h-7 w-7 text-primary" /> Dean's List Management</h1>
            <p className="text-muted-foreground mt-1">Recognize top-performing students per semester. Honors are computed from real graded coursework.</p>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Default Settings</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label>GPA threshold (Albanian, ≥)</Label>
              <Input type="number" step="0.1" min={4} max={10} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
            </div>
            <div>
              <Label>Minimum completed courses</Label>
              <Input type="number" min={1} value={minCourses} onChange={(e) => setMinCourses(Number(e.target.value))} />
            </div>
            <div className="flex items-end">
              <Button onClick={saveSettings} variant="outline">Save defaults</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Generate / Manage List</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <Label>Semester</Label>
                <Select value={semesterId} onValueChange={setSemesterId}>
                  <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
                  <SelectContent>
                    {semesters.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Program</Label>
                <Select value={program} onValueChange={setProgram}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All programs</SelectItem>
                    {programs.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={generate} disabled={generating || !semesterId}>
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Generate / Update
                </Button>
              </div>
            </div>

            {snapshot && (
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 flex-wrap gap-3">
                <div className="text-sm">
                  <div><strong>Threshold:</strong> {Number(snapshot.threshold_gpa).toFixed(2)} • <strong>Generated:</strong> {new Date(snapshot.generated_at).toLocaleString()}</div>
                  <div className="text-muted-foreground">Snapshot ID: {snapshot.id.slice(0, 8)}…</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={snapshot.is_published ? "default" : "secondary"}>
                    {snapshot.is_published ? "Published" : "Draft"}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Switch checked={snapshot.is_published} onCheckedChange={togglePublish} id="pub" />
                    <Label htmlFor="pub" className="cursor-pointer">Publish to public page</Label>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => refetch()}><RefreshCw className="h-3.5 w-3.5 mr-1" />Refresh</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" /> Ranked Students</CardTitle></CardHeader>
          <CardContent>
            {loadingSnap || loadingEntries ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : !snapshot ? (
              <p className="text-muted-foreground text-sm">No snapshot yet for this selection. Click "Generate / Update".</p>
            ) : entries.length === 0 ? (
              <p className="text-muted-foreground text-sm">No students met the threshold.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead className="text-right">GPA (10)</TableHead>
                    <TableHead className="text-right">GPA (4.0)</TableHead>
                    <TableHead className="text-right">Certificate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-bold">#{e.rank}</TableCell>
                      <TableCell>{e.full_name}</TableCell>
                      <TableCell>{e.program}</TableCell>
                      <TableCell className="text-right">{Number(e.gpa_albanian).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{Number(e.gpa_4).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => exportCert(e)}>
                          <Download className="h-3.5 w-3.5 mr-1" /> PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDeansList;
