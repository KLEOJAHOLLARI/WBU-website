import { useMemo, useState } from "react";
import ProfessorLayout from "@/components/ProfessorLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CalendarDays, Search } from "lucide-react";

type ExamRow = {
  id: string;
  program: string;
  course_id: string | null;
  exam_date: string;
  start_time: string;
  end_time: string;
  room: string;
  exam_type: string;
  notes: string | null;
  is_published: boolean;
  supervisor_name: string;
  courses?: { id: string; name: string; code: string; professor_id: string | null } | null;
};

const typeColors: Record<string, string> = {
  final: "bg-primary/10 text-primary border-primary/20",
  midterm: "bg-amber-100 text-amber-700 border-amber-200",
  retake: "bg-red-100 text-red-700 border-red-200",
  quiz: "bg-blue-100 text-blue-700 border-blue-200",
};

const ProfessorExamSchedule = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<string>("upcoming");
  const [type, setType] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ["professor-exam-schedule", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_schedule")
        .select("*, courses(id, name, code, professor_id)")
        .order("exam_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ExamRow[];
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const myExams = useMemo(() => exams.filter((e) => e.courses?.professor_id === user?.id), [exams, user?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return myExams.filter((e) => {
      if (filter === "upcoming" && e.exam_date < today) return false;
      if (filter === "past" && e.exam_date >= today) return false;
      if (type !== "all" && e.exam_type !== type) return false;
      if (!q) return true;
      const hay = [e.courses?.name, e.courses?.code, e.room, e.notes].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [myExams, filter, type, today, search]);

  const upcomingCount = myExams.filter((e) => e.exam_date >= today).length;

  return (
    <ProfessorLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-6 w-6" /> Exam Schedule
          </h1>
          <p className="mt-1 text-muted-foreground">Exams scheduled for courses you teach</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-3xl font-bold text-foreground">{myExams.length}</p>
          <p className="text-sm text-muted-foreground">Total</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-3xl font-bold text-primary">{upcomingCount}</p>
          <p className="text-sm text-muted-foreground">Upcoming</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-3xl font-bold text-muted-foreground">{myExams.length - upcomingCount}</p>
          <p className="text-sm text-muted-foreground">Past</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search course or room…" className="pl-9" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="past">Past</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="midterm">Midterm</SelectItem>
            <SelectItem value="final">Final</SelectItem>
            <SelectItem value="retake">Retake</SelectItem>
            <SelectItem value="quiz">Quiz</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No exams scheduled</TableCell></TableRow>
            ) : filtered.map((e) => (
              <TableRow key={e.id} className={e.exam_date < today ? "opacity-60" : ""}>
                <TableCell className="font-medium">
                  {e.courses?.name || "—"}
                  {e.courses?.code && <span className="ml-1 text-xs text-muted-foreground">({e.courses.code})</span>}
                </TableCell>
                <TableCell>
                  <Badge className={typeColors[e.exam_type] || "bg-muted"}>{e.exam_type}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">{new Date(e.exam_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</TableCell>
                <TableCell className="whitespace-nowrap">{e.start_time}–{e.end_time}</TableCell>
                <TableCell>{e.room || "TBD"}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate">{e.notes || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ProfessorLayout>
  );
};

export default ProfessorExamSchedule;
