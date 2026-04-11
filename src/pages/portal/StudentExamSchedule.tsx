import StudentLayout from "@/components/StudentLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { useActiveSemester } from "@/hooks/useActiveSemester";
import SemesterBadge from "@/components/SemesterBadge";

const StudentExamSchedule = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<string>("all");
  const { data: activeSemester } = useActiveSemester();

  const { data: profile } = useQuery({
    queryKey: ["student-profile-exam", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("program").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["student-enrollments-exam", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("enrollments").select("course_id").eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ["student-exam-schedule", profile?.program, activeSemester?.year, activeSemester?.semester],
    queryFn: async () => {
      let query = supabase
        .from("exam_schedule")
        .select("*, courses(name, code, year, semester)")
        .order("exam_date", { ascending: true });
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const enrolledCourseIds = new Set(enrollments.map((e) => e.course_id));

  // Filter to show only exams for enrolled courses or student's program, scoped to active semester
  const relevantExams = exams.filter((e: any) => {
    // Semester filter: if active semester set, only show exams for courses in that semester
    if (activeSemester && e.courses) {
      if (e.courses.year !== activeSemester.year || e.courses.semester !== activeSemester.semester) return false;
    }
    if (e.course_id && enrolledCourseIds.has(e.course_id)) return true;
    if (e.program === profile?.program) return true;
    return false;
  });

  const now = new Date().toISOString().slice(0, 10);
  const upcoming = relevantExams.filter((e: any) => e.exam_date >= now);
  const past = relevantExams.filter((e: any) => e.exam_date < now);

  const displayed = filter === "upcoming" ? upcoming : filter === "past" ? past : relevantExams;

  const typeColors: Record<string, string> = {
    final: "bg-primary/10 text-primary",
    midterm: "bg-amber-100 text-amber-700",
    quiz: "bg-blue-100 text-blue-700",
    retake: "bg-red-100 text-red-700",
  };

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
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Exams</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="past">Past</SelectItem>
          </SelectContent>
        </Select>
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

      <div className="mt-6 rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : displayed.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No exams scheduled</TableCell></TableRow>
            ) : displayed.map((exam: any) => (
              <TableRow key={exam.id} className={exam.exam_date < now ? "opacity-60" : ""}>
                <TableCell className="font-medium">
                  {exam.courses?.name || "—"}
                  {exam.courses?.code && <span className="ml-1 text-xs text-muted-foreground">({exam.courses.code})</span>}
                </TableCell>
                <TableCell>{new Date(exam.exam_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</TableCell>
                <TableCell>{exam.start_time} – {exam.end_time}</TableCell>
                <TableCell>{exam.room || "TBD"}</TableCell>
                <TableCell>
                  <Badge className={typeColors[exam.exam_type] || "bg-muted text-muted-foreground"}>
                    {exam.exam_type}
                  </Badge>
                </TableCell>
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
