import { Link } from "react-router-dom";
import ProfessorLayout from "@/components/ProfessorLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  BookOpen, Users, TrendingUp, AlertTriangle, CalendarDays,
  ArrowRight, Loader2, Search, GraduationCap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState, useMemo } from "react";
import { useActiveSemester } from "@/hooks/useActiveSemester";
import SemesterBadge from "@/components/SemesterBadge";

const gradeColor = (pct: number) => {
  if (pct >= 70) return "text-emerald-600";
  if (pct >= 45) return "text-amber-600";
  return "text-destructive";
};

const ProfessorDashboard = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const { data: activeSemester } = useActiveSemester();

  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["professor-courses", user?.id, activeSemester?.year, activeSemester?.semester],
    queryFn: async () => {
      let query = supabase
        .from("courses")
        .select("*")
        .eq("professor_id", user!.id)
        .order("program")
        .order("year");
      // Filter by active semester if set
      if (activeSemester) {
        query = query.eq("year", activeSemester.year).eq("semester", activeSemester.semester);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch enrollment counts per course
  const { data: enrollmentCounts = {} } = useQuery({
    queryKey: ["professor-enrollment-counts", user?.id, courses.map(c => c.id)],
    queryFn: async () => {
      if (!courses.length) return {};
      const { data, error } = await supabase
        .from("enrollments")
        .select("course_id")
        .in("course_id", courses.map(c => c.id));
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach(e => {
        counts[e.course_id] = (counts[e.course_id] || 0) + 1;
      });
      return counts;
    },
    enabled: courses.length > 0,
  });

  // Fetch timetable entries for schedule info
  const { data: timetableEntries = [] } = useQuery({
    queryKey: ["professor-timetable", user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!profile?.full_name) return [];
      const { data, error } = await supabase
        .from("timetable_entries")
        .select("*")
        .ilike("professor_name", `%${profile.full_name}%`);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch grade components + grades for avg calculation
  const { data: gradeStats = {} } = useQuery({
    queryKey: ["professor-grade-stats", courses.map(c => c.id)],
    queryFn: async () => {
      if (!courses.length) return {};
      const courseIds = courses.map(c => c.id);

      const { data: comps } = await supabase
        .from("grade_components")
        .select("*")
        .in("course_id", courseIds);

      const { data: enrs } = await supabase
        .from("enrollments")
        .select("id, course_id")
        .in("course_id", courseIds);

      if (!enrs?.length || !comps?.length) return {};

      const { data: allGrades } = await supabase
        .from("grades")
        .select("*")
        .in("enrollment_id", enrs.map(e => e.id));

      // Compute per-course avg
      const stats: Record<string, { avg: number; count: number }> = {};
      courseIds.forEach(cid => {
        const courseComps = (comps || []).filter(c => c.course_id === cid);
        const courseEnrs = (enrs || []).filter(e => e.course_id === cid);
        if (!courseComps.length || !courseEnrs.length) return;

        let totalSum = 0;
        let studentCount = 0;
        courseEnrs.forEach(enr => {
          let studentTotal = 0;
          let hasGrades = false;
          courseComps.forEach(comp => {
            for (let i = 1; i <= comp.count; i++) {
              const g = (allGrades || []).find(
                gr => gr.enrollment_id === enr.id && gr.grade_component_id === comp.id && gr.instance_number === i
              );
              if (g && g.score !== null) {
                studentTotal += (Number(g.score) / Number(g.max_score)) * Number(comp.weight);
                hasGrades = true;
              }
            }
          });
          if (hasGrades) {
            totalSum += studentTotal;
            studentCount++;
          }
        });
        if (studentCount > 0) {
          stats[cid] = { avg: Math.round(totalSum / studentCount), count: studentCount };
        }
      });
      return stats;
    },
    enabled: courses.length > 0,
  });

  // Fetch attendance stats
  const { data: attStats = {} } = useQuery({
    queryKey: ["professor-att-stats", courses.map(c => c.id)],
    queryFn: async () => {
      if (!courses.length) return {};
      const courseIds = courses.map(c => c.id);

      const { data: sessions } = await supabase
        .from("attendance_sessions")
        .select("id, course_id")
        .in("course_id", courseIds);
      if (!sessions?.length) return {};

      const { data: enrs } = await supabase
        .from("enrollments")
        .select("id, course_id")
        .in("course_id", courseIds);
      if (!enrs?.length) return {};

      const { data: records } = await supabase
        .from("attendance_records")
        .select("enrollment_id, status")
        .in("enrollment_id", enrs.map(e => e.id));

      const stats: Record<string, { sessions: number; lowCount: number }> = {};
      courseIds.forEach(cid => {
        const courseSessions = sessions.filter(s => s.course_id === cid);
        const courseEnrs = enrs.filter(e => e.course_id === cid);
        if (!courseSessions.length || !courseEnrs.length) return;

        let lowCount = 0;
        courseEnrs.forEach(enr => {
          const present = (records || []).filter(
            r => r.enrollment_id === enr.id && r.status === "present"
          ).length;
          const pct = Math.round((present / courseSessions.length) * 100);
          if (pct < 75) lowCount++;
        });
        stats[cid] = { sessions: courseSessions.length, lowCount };
      });
      return stats;
    },
    enabled: courses.length > 0,
  });

  const totalStudents = useMemo(() => {
    return Object.values(enrollmentCounts).reduce((s, c) => s + c, 0);
  }, [enrollmentCounts]);

  const filteredCourses = useMemo(() => {
    if (!search) return courses;
    const q = search.toLowerCase();
    return courses.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.program.toLowerCase().includes(q)
    );
  }, [courses, search]);

  const getScheduleForCourse = (courseName: string) => {
    return timetableEntries.filter(t =>
      t.course_name.toLowerCase() === courseName.toLowerCase()
    );
  };

  const dayOrder: Record<string, number> = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };

  if (loadingCourses) {
    return (
      <ProfessorLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...
        </div>
      </ProfessorLayout>
    );
  }

  return (
    <ProfessorLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Professor Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Overview of your courses, students, and performance</p>
        <div className="mt-2"><SemesterBadge /></div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <BookOpen className="mb-2 h-5 w-5 text-primary" />
          <p className="font-display text-3xl font-bold text-foreground">{courses.length}</p>
          <p className="text-sm text-muted-foreground">Active Courses</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <Users className="mb-2 h-5 w-5 text-primary" />
          <p className="font-display text-3xl font-bold text-foreground">{totalStudents}</p>
          <p className="text-sm text-muted-foreground">Total Students</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <TrendingUp className="mb-2 h-5 w-5 text-emerald-600" />
          <p className="font-display text-3xl font-bold text-foreground">
            {Object.values(gradeStats as Record<string, { avg: number }>).length > 0
              ? `${Math.round(Object.values(gradeStats as Record<string, { avg: number }>).reduce((s, v) => s + v.avg, 0) / Object.values(gradeStats).length)}%`
              : "—"}
          </p>
          <p className="text-sm text-muted-foreground">Overall Average</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <AlertTriangle className="mb-2 h-5 w-5 text-amber-500" />
          <p className="font-display text-3xl font-bold text-foreground">
            {Object.values(attStats as Record<string, { lowCount: number }>).reduce((s, v) => s + v.lowCount, 0)}
          </p>
          <p className="text-sm text-muted-foreground">Low Attendance</p>
        </div>
      </div>

      {/* Courses section */}
      <div className="mt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-foreground">Your Courses</h2>
          {courses.length > 3 && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses..."
                className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
            </div>
          )}
        </div>

        {courses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
            <GraduationCap className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">No courses assigned to you yet.</p>
            <p className="mt-1 text-sm text-muted-foreground/70">Contact admin to be assigned courses.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredCourses.map((c) => {
              const studentCount = enrollmentCounts[c.id] || 0;
              const stats = (gradeStats as Record<string, { avg: number; count: number }>)[c.id];
              const att = (attStats as Record<string, { sessions: number; lowCount: number }>)[c.id];
              const schedule = getScheduleForCourse(c.name).sort(
                (a, b) => (dayOrder[a.day_of_week] || 99) - (dayOrder[b.day_of_week] || 99)
              );

              return (
                <Link
                  key={c.id}
                  to={`/professor/courses/${c.id}`}
                  className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
                >
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display font-semibold text-foreground truncate">{c.name}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">{c.code} · {c.program}</p>
                    </div>
                    <Badge variant="secondary" className="flex-shrink-0 text-[10px]">
                      Y{c.year} S{c.semester}
                    </Badge>
                  </div>

                  {/* Stats row */}
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-bold text-foreground">{studentCount}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Students</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className={`text-sm font-bold ${stats ? gradeColor(stats.avg) : "text-muted-foreground"}`}>
                          {stats ? `${stats.avg}%` : "—"}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Avg Grade</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {att && att.lowCount > 0 ? (
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                        ) : (
                          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span className={`text-sm font-bold ${att && att.lowCount > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                          {att ? (att.lowCount > 0 ? att.lowCount : "✓") : "—"}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{att && att.lowCount > 0 ? "Low Att." : "Attendance"}</p>
                    </div>
                  </div>

                  {/* Grade progress bar */}
                  {stats && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Class average</span>
                        <span>{stats.avg}%</span>
                      </div>
                      <Progress value={stats.avg} className="h-1.5" />
                    </div>
                  )}

                  {/* Schedule */}
                  {schedule.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {schedule.slice(0, 3).map((s, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground"
                        >
                          <CalendarDays className="h-2.5 w-2.5" />
                          {s.day_of_week.slice(0, 3)} {s.start_time}–{s.end_time}
                        </span>
                      ))}
                      {schedule.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{schedule.length - 3} more</span>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-4 flex items-center justify-end text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    View details <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {search && filteredCourses.length === 0 && (
          <p className="mt-4 text-center text-sm text-muted-foreground">No courses match "{search}"</p>
        )}
      </div>
    </ProfessorLayout>
  );
};

export default ProfessorDashboard;
