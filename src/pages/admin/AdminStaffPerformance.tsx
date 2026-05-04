import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Award, AlertTriangle, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

type Row = {
  professor_id: string;
  full_name: string;
  department: string;
  feedback_score: number | null;
  feedback_count: number;
  attendance_score: number | null;
  grading_score: number | null;
  performance_score: number | null;
};

const ratingFor = (score: number | null) => {
  if (score === null) return { label: "No data", className: "bg-muted text-muted-foreground" };
  if (score >= 80) return { label: "Excellent", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" };
  if (score >= 60) return { label: "Good", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400" };
  return { label: "Needs Improvement", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" };
};

const fmt = (v: number | null) => (v === null || v === undefined ? "—" : `${Math.round(v)}`);

const AdminStaffPerformance = () => {
  const [semester, setSemester] = useState<string>("all");
  const [department, setDepartment] = useState<string>("all");

  const { data: semesters = [] } = useQuery({
    queryKey: ["semesters-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("academic_semesters")
        .select("id, name")
        .order("start_date", { ascending: false });
      return data || [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["staff-performance", semester],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_all_professors_performance", {
        _semester_id: semester === "all" ? null : semester,
      });
      if (error) throw error;
      return (data || []) as Row[];
    },
  });

  const departments = useMemo(() => {
    const set = new Set<string>();
    (data || []).forEach((r) => r.department && set.add(r.department));
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    return (data || []).filter((r) => department === "all" || r.department === department);
  }, [data, department]);

  const stats = useMemo(() => {
    const eligible = filtered.filter((r) => r.performance_score !== null);
    const avg = eligible.length
      ? eligible.reduce((s, r) => s + (r.performance_score || 0), 0) / eligible.length
      : 0;
    return {
      total: filtered.length,
      avg: Math.round(avg),
      excellent: eligible.filter((r) => (r.performance_score || 0) >= 80).length,
      needs: eligible.filter((r) => (r.performance_score || 0) < 60).length,
    };
  }, [filtered]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Staff Performance</h1>
          <p className="text-muted-foreground mt-1">
            Evaluate professors based on student feedback, attendance consistency, and grading timeliness.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Professors</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.avg}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Excellent</CardTitle>
              <ThumbsUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.excellent}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Needs Improvement</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.needs}</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <CardTitle>Performance Overview</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Semester" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All semesters</SelectItem>
                    {semesters.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">No professors found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Professor</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Feedback</TableHead>
                    <TableHead className="text-center">Attendance</TableHead>
                    <TableHead className="text-center">Grading</TableHead>
                    <TableHead className="text-center">Final</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const rating = ratingFor(r.performance_score);
                    return (
                      <TableRow key={r.professor_id}>
                        <TableCell className="font-medium">{r.full_name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{r.department || "—"}</TableCell>
                        <TableCell className="text-center">
                          {fmt(r.feedback_score)}
                          <div className="text-[10px] text-muted-foreground">{r.feedback_count} responses</div>
                        </TableCell>
                        <TableCell className="text-center">{fmt(r.attendance_score)}</TableCell>
                        <TableCell className="text-center">{fmt(r.grading_score)}</TableCell>
                        <TableCell className="text-center font-bold">{fmt(r.performance_score)}</TableCell>
                        <TableCell><Badge className={rating.className} variant="outline">{rating.label}</Badge></TableCell>
                        <TableCell className="text-right">
                          <ProfessorDetailsButton
                            professorId={r.professor_id}
                            name={r.full_name}
                            semesterId={semester === "all" ? null : semester}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

const ProfessorDetailsButton = ({
  professorId, name, semesterId,
}: { professorId: string; name: string; semesterId: string | null }) => {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["prof-perf-detail", professorId, semesterId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_professor_performance", {
        _professor_id: professorId,
        _semester_id: semesterId,
      });
      if (error) throw error;
      return data as any;
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">View</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{name} — Anonymous Feedback</DialogTitle></DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : !data?.ok ? (
          <p className="text-muted-foreground">No data available.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Avg Rating</div>
                <div className="text-xl font-bold">{data.feedback_avg ?? "—"}/5</div>
                <div className="text-xs text-muted-foreground">{data.feedback_count} responses</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Sessions Recorded</div>
                <div className="text-xl font-bold">{data.attendance_recorded}/{data.attendance_expected}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Avg Grading Delay</div>
                <div className="text-xl font-bold">{data.avg_grading_delay_days} d</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Comments ({(data.comments || []).length})</h4>
              <div className="max-h-64 overflow-auto space-y-2">
                {(data.comments || []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">No comments yet.</p>
                ) : (
                  (data.comments as any[]).map((c, i) => (
                    <div key={i} className="rounded border p-3 text-sm">
                      <div className="text-xs text-muted-foreground mb-1">★ {c.rating}/5</div>
                      <p>{c.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdminStaffPerformance;
