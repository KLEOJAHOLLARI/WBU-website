import StudentLayout from "@/components/StudentLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CalendarDays, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useActiveSemester } from "@/hooks/useActiveSemester";
import SemesterBadge from "@/components/SemesterBadge";
import { useNavigate } from "react-router-dom";

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
  courses?: { id: string; name: string; code: string; year: number; semester: number; program: string } | null;
};

const typeColors: Record<string, string> = {
  final: "bg-primary/10 text-primary border-primary/20",
  midterm: "bg-amber-100 text-amber-700 border-amber-200",
  retake: "bg-red-100 text-red-700 border-red-200",
  quiz: "bg-blue-100 text-blue-700 border-blue-200",
};

const StudentExamSchedule = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>("upcoming");
  const [type, setType] = useState<string>("all");
  const [search, setSearch] = useState("");
  const { data: activeSemester } = useActiveSemester();

  const { data: profile } = useQuery({
    queryKey: ["student-profile-exam", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("program, current_year, current_semester")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["student-enrollments-exam", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("enrollments").select("course_id").eq("user_id", user!.id);
      return data ?? [];
    },
  });

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ["student-exam-schedule"],
    enabled: !!user,
    queryFn: async () => {
      // RLS already restricts to published exams
      const { data, error } = await supabase
        .from("exam_schedule")
        .select("*, courses(id, name, code, year, semester, program)")
        .order("exam_date", { ascending: true })
        .order("start_time");
      if (error) throw error;
      return (data ?? []) as unknown as ExamRow[];
    },
  });

  const enrolledCourseIds = useMemo(() => new Set(enrollments.map((e) => e.course_id)), [enrollments]);

  // Show exams for enrolled courses, OR exams for student's program (no specific course)
  // matching their current year/semester (when known)
  const relevantExams = useMemo(() => {
    return exams.filter((e) => {
      // Direct enrollment match always wins
      if (e.course_id && enrolledCourseIds.has(e.course_id)) return true;

      // Program-level exams (no specific course): require program match
      if (!e.course_id && profile?.program && e.program === profile.program) return true;

      // Course-attached exam but student isn't enrolled — exclude
      return false;
    });
  }, [exams, enrolledCourseIds, profile?.program]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = relevantExams.filter((e) => e.exam_date >= today);
  const past = relevantExams.filter((e) => e.exam_date < today);

  const displayed = useMemo(() => {
    const base = filter === "upcoming" ? upcoming : filter === "past" ? past : relevantExams;
    const q = search.trim().toLowerCase();
    return base.filter((e) => {
      if (type !== "all" && e.exam_type !== type) return false;
      if (!q) return true;
      const hay = [e.courses?.name, e.courses?.code, e.room, e.supervisor_name, e.notes].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [filter, type, search, upcoming, past, relevantExams]);

  return (
    <StudentLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-6 w-6" /> Exam Schedule
          </h1>
          <p className="mt-1 text-muted-foreground">Your upcoming and past exams</p>
          <div className="mt-2"><SemesterBadge /></div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-3xl font-bold text-foreground">{relevantExams.length}</p>
          <p className="text-sm text-muted-foreground">Total Exams</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-3xl font-bold text-primary">{upcoming.length}</p>
          <p className="text-sm text-muted-foreground">Upcoming</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-3xl font-bold text-muted-foreground">{past.length}</p>
          <p className="text-sm text-muted-foreground">Completed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search course, room…" className="pl-9" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Exams</SelectItem>
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
              <TableHead>Supervisor</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : displayed.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No exams scheduled
              </TableCell></TableRow>
            ) : displayed.map((exam) => (
              <TableRow
                key={exam.id}
                className={`cursor-pointer hover:bg-muted/40 transition-colors ${exam.exam_date < today ? "opacity-60" : ""}`}
                onClick={() => navigate(`/portal/exams/${exam.id}`)}
              >
                <TableCell className="font-medium">
                  {exam.courses?.name || (exam.program && "Program-wide")}
                  {exam.courses?.code && <span className="ml-1 text-xs text-muted-foreground">({exam.courses.code})</span>}
                </TableCell>
                <TableCell>
                  <Badge className={typeColors[exam.exam_type] || "bg-muted text-muted-foreground"}>{exam.exam_type}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">{new Date(exam.exam_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</TableCell>
                <TableCell className="whitespace-nowrap">{exam.start_time} – {exam.end_time}</TableCell>
                <TableCell>{exam.room || "TBD"}</TableCell>
                <TableCell className="text-sm">{exam.supervisor_name || "—"}</TableCell>
                <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{exam.notes || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </StudentLayout>
  );
};

export default StudentExamSchedule;
