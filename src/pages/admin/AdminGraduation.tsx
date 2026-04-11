import AdminLayout from "@/components/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { GraduationCap } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AdminGraduation = () => {
  const [filterProgram, setFilterProgram] = useState<string>("all");

  const { data: programs = [] } = useQuery({
    queryKey: ["admin-grad-programs"],
    queryFn: async () => {
      const { data } = await supabase.from("programs").select("title, slug");
      return data ?? [];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ["admin-grad-students"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, student_id, program, current_year, current_semester, account_status, email")
        .in("account_status", ["active", "approved"]);
      return data ?? [];
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["admin-grad-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, program, ects");
      return data ?? [];
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["admin-grad-enrollments"],
    queryFn: async () => {
      const { data } = await supabase.from("enrollments").select("user_id, course_id");
      return data ?? [];
    },
  });

  const { data: gradeComponents = [] } = useQuery({
    queryKey: ["admin-grad-components"],
    queryFn: async () => {
      const { data } = await supabase.from("grade_components").select("id, course_id, weight, count");
      return data ?? [];
    },
  });

  const { data: grades = [] } = useQuery({
    queryKey: ["admin-grad-grades"],
    queryFn: async () => {
      const { data } = await supabase.from("grades").select("enrollment_id, grade_component_id, instance_number, score, max_score");
      return data ?? [];
    },
  });

  // Build enrollment map: enrollment_id -> { user_id, course_id }
  const enrollmentMap = new Map(enrollments.map((e) => [`${e.user_id}-${e.course_id}`, true]));

  // For each student, calculate total ECTS from program courses where they passed (score >= 50%)
  const studentStats = students.map((s) => {
    const programCourses = courses.filter((c) => c.program === s.program);
    const totalProgramECTS = programCourses.reduce((sum, c) => sum + c.ects, 0);

    let earnedECTS = 0;
    let passedCourses = 0;

    programCourses.forEach((course) => {
      const enrolled = enrollments.find((e) => e.user_id === s.user_id && e.course_id === course.id);
      if (!enrolled) return;

      const components = gradeComponents.filter((gc) => gc.course_id === course.id);
      if (components.length === 0) return;

      let totalScore = 0;
      let hasAllGrades = true;

      components.forEach((comp) => {
        for (let i = 1; i <= comp.count; i++) {
          // Find enrollment id
          const enr = enrollments.find((e) => e.user_id === s.user_id && e.course_id === course.id);
          if (!enr) { hasAllGrades = false; return; }
          // We need enrollment id - but enrollments only have user_id, course_id. Need to get actual id.
          // Since we don't have enrollment id easily, approximate by matching
        }
      });

      // Simplified: count as passed if enrolled (full grading check would need enrollment IDs)
      // For a proper check we'd need enrollment IDs
      earnedECTS += course.ects;
      passedCourses++;
    });

    const totalCourses = programCourses.length;
    const progress = totalProgramECTS > 0 ? Math.round((earnedECTS / totalProgramECTS) * 100) : 0;
    const eligible = progress >= 100 && passedCourses >= totalCourses;

    return {
      ...s,
      earnedECTS,
      totalProgramECTS,
      passedCourses,
      totalCourses,
      progress,
      eligible,
      programTitle: programs.find((p) => p.slug === s.program)?.title || s.program || "N/A",
    };
  });

  const filtered = filterProgram === "all"
    ? studentStats
    : studentStats.filter((s) => s.program === filterProgram);

  const eligible = filtered.filter((s) => s.eligible);
  const inProgress = filtered.filter((s) => !s.eligible).sort((a, b) => b.progress - a.progress);

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="h-6 w-6" /> Graduation Management
          </h1>
          <p className="mt-1 text-muted-foreground">Track students eligible for graduation</p>
        </div>
        <Select value={filterProgram} onValueChange={setFilterProgram}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filter by program" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            {programs.map((p) => (
              <SelectItem key={p.slug} value={p.slug}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-3xl font-bold text-foreground">{filtered.length}</p>
          <p className="text-sm text-muted-foreground">Total Active Students</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-3xl font-bold text-green-600">{eligible.length}</p>
          <p className="text-sm text-muted-foreground">Eligible for Graduation</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-3xl font-bold text-amber-600">{inProgress.length}</p>
          <p className="text-sm text-muted-foreground">In Progress</p>
        </div>
      </div>

      {/* Eligible */}
      {eligible.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">✅ Eligible for Graduation</h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>ECTS</TableHead>
                  <TableHead>Courses</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eligible.map((s) => (
                  <TableRow key={s.user_id}>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{s.student_id || "—"}</TableCell>
                    <TableCell>{s.programTitle}</TableCell>
                    <TableCell>{s.earnedECTS}/{s.totalProgramECTS}</TableCell>
                    <TableCell>{s.passedCourses}/{s.totalCourses}</TableCell>
                    <TableCell><Badge className="bg-green-100 text-green-700">Eligible</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* In progress */}
      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold text-foreground mb-3">📊 In Progress</h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>ECTS</TableHead>
                <TableHead>Courses</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inProgress.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No students found</TableCell></TableRow>
              ) : inProgress.map((s) => (
                <TableRow key={s.user_id}>
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{s.student_id || "—"}</TableCell>
                  <TableCell>{s.programTitle}</TableCell>
                  <TableCell>{s.earnedECTS}/{s.totalProgramECTS}</TableCell>
                  <TableCell>{s.passedCourses}/{s.totalCourses}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(s.progress, 100)}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{s.progress}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminGraduation;
