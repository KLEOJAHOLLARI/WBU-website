import ProfessorLayout from "@/components/ProfessorLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

const ProfessorCourses = () => {
  const { user } = useAuth();

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

  return (
    <ProfessorLayout>
      <h1 className="font-display text-2xl font-bold text-foreground">My Courses</h1>
      <p className="text-sm text-muted-foreground">Manage grades, attendance, and evaluation schemes</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : courses.length === 0 ? (
          <div className="col-span-full rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            No courses assigned to you yet. Contact admin to be assigned courses.
          </div>
        ) : (
          courses.map((c) => (
            <Link
              key={c.id}
              to={`/professor/courses/${c.id}`}
              className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <h3 className="font-display font-semibold text-foreground">{c.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{c.code} · {c.program}</p>
              <p className="text-xs text-muted-foreground">Year {c.year} · Semester {c.semester}</p>
            </Link>
          ))
        )}
      </div>
    </ProfessorLayout>
  );
};

export default ProfessorCourses;
