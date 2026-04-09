import ProfessorLayout from "@/components/ProfessorLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { useState, useMemo } from "react";
import {
  BookOpen, Users, TrendingUp, AlertTriangle, CalendarDays,
  ArrowRight, Loader2, Search, GraduationCap, Filter
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const gradeColor = (pct: number) => {
  if (pct >= 70) return "text-emerald-600";
  if (pct >= 50) return "text-amber-600";
  return "text-destructive";
};

const ProfessorCourses = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterProgram, setFilterProgram] = useState("all");
  const [filterSemester, setFilterSemester] = useState("all");

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["professor-courses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("professor_id", user!.id)
        .order("program")
        .order("year");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: enrollmentCounts = {} } = useQuery({
    queryKey: ["prof-enr-counts", courses.map(c => c.id)],
    queryFn: async () => {
      if (!courses.length) return {};
      const { data } = await supabase
        .from("enrollments")
        .select("course_id")
        .in("course_id", courses.map(c => c.id));
      const counts: Record<string, number> = {};
      (data || []).forEach(e => { counts[e.course_id] = (counts[e.course_id] || 0) + 1; });
      return counts;
    },
    enabled: courses.length > 0,
  });

  const { data: gradeStats = {} } = useQuery({
    queryKey: ["prof-grade-stats", courses.map(c => c.id)],
    queryFn: async () => {
      if (!courses.length) return {};
      const courseIds = courses.map(c => c.id);
      const { data: comps } = await supabase.from("grade_components").select("*").in("course_id", courseIds);
      const { data: enrs } = await supabase.from("enrollments").select("id, course_id").in("course_id", courseIds);
      if (!enrs?.length || !comps?.length) return {};
      const { data: allGrades } = await supabase.from("grades").select("*").in("enrollment_id", enrs.map(e => e.id));

      const stats: Record<string, number> = {};
      courseIds.forEach(cid => {
        const cc = (comps || []).filter(c => c.course_id === cid);
        const ce = (enrs || []).filter(e => e.course_id === cid);
        if (!cc.length || !ce.length) return;
        let sum = 0, cnt = 0;
        ce.forEach(enr => {
          let t = 0; let has = false;
          cc.forEach(comp => {
            for (let i = 1; i <= comp.count; i++) {
              const g = (allGrades || []).find(gr => gr.enrollment_id === enr.id && gr.grade_component_id === comp.id && gr.instance_number === i);
              if (g?.score !== null && g?.score !== undefined) { t += (Number(g.score) / Number(g.max_score)) * Number(comp.weight); has = true; }
            }
          });
          if (has) { sum += t; cnt++; }
        });
        if (cnt > 0) stats[cid] = Math.round(sum / cnt);
      });
      return stats;
    },
    enabled: courses.length > 0,
  });

  const programs = useMemo(() => [...new Set(courses.map(c => c.program))], [courses]);
  const semesters = useMemo(() => [...new Set(courses.map(c => `${c.year}-${c.semester}`))].sort(), [courses]);

  const filteredCourses = useMemo(() => {
    let result = courses;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
    }
    if (filterProgram !== "all") result = result.filter(c => c.program === filterProgram);
    if (filterSemester !== "all") {
      const [y, s] = filterSemester.split("-").map(Number);
      result = result.filter(c => c.year === y && c.semester === s);
    }
    return result;
  }, [courses, search, filterProgram, filterSemester]);

  const inputBase = "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors";

  return (
    <ProfessorLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">My Courses</h1>
        <p className="text-sm text-muted-foreground">Manage grades, attendance, and evaluation schemes</p>
      </div>

      {/* Filters */}
      {courses.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses..." className={`${inputBase} pl-9`} />
          </div>
          {programs.length > 1 && (
            <select value={filterProgram} onChange={e => setFilterProgram(e.target.value)} className={`${inputBase} w-full sm:w-44`}>
              <option value="all">All Programs</option>
              {programs.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
          {semesters.length > 1 && (
            <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)} className={`${inputBase} w-full sm:w-36`}>
              <option value="all">All Semesters</option>
              {semesters.map(s => { const [y, sem] = s.split("-"); return <option key={s} value={s}>Year {y} Sem {sem}</option>; })}
            </select>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading courses...
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <GraduationCap className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">No courses assigned to you yet.</p>
          <p className="mt-1 text-sm text-muted-foreground/70">Contact admin to be assigned courses.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((c) => {
              const count = enrollmentCounts[c.id] || 0;
              const avg = (gradeStats as Record<string, number>)[c.id];

              return (
                <Link
                  key={c.id}
                  to={`/professor/courses/${c.id}`}
                  className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display font-semibold text-foreground truncate">{c.name}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">{c.code} · {c.program}</p>
                    </div>
                    <Badge variant="secondary" className="flex-shrink-0 text-[10px]">Y{c.year} S{c.semester}</Badge>
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-semibold text-foreground">{count}</span>
                      <span className="text-xs text-muted-foreground">students</span>
                    </div>
                    {avg !== undefined && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className={`font-semibold ${gradeColor(avg)}`}>{avg}%</span>
                        <span className="text-xs text-muted-foreground">avg</span>
                      </div>
                    )}
                  </div>

                  {avg !== undefined && (
                    <Progress value={avg} className="mt-3 h-1.5" />
                  )}

                  <div className="mt-3 flex items-center justify-end text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Open course <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </div>
                </Link>
              );
            })}
          </div>

          {search && filteredCourses.length === 0 && (
            <p className="mt-6 text-center text-sm text-muted-foreground">No courses match your filters.</p>
          )}
        </>
      )}
    </ProfessorLayout>
  );
};

export default ProfessorCourses;
