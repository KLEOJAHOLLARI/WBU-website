import ProfessorLayout from "@/components/ProfessorLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, Users, ClipboardCheck } from "lucide-react";

const ProfessorDashboard = () => {
  const { user } = useAuth();

  const { data: courses = [] } = useQuery({
    queryKey: ["professor-courses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("professor_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <ProfessorLayout>
      <h1 className="font-display text-2xl font-bold text-foreground">Professor Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manage your courses, grades, and attendance</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <BookOpen className="mb-2 h-6 w-6 text-primary" />
          <p className="font-display text-3xl font-bold text-foreground">{courses.length}</p>
          <p className="text-sm text-muted-foreground">Active Courses</p>
        </div>
      </div>

      {courses.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Your Courses</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <a
                key={c.id}
                href={`/professor/courses/${c.id}`}
                className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
              >
                <h3 className="font-display font-semibold text-foreground">{c.name}</h3>
                <p className="text-xs text-muted-foreground">{c.code} · {c.program}</p>
                <p className="text-xs text-muted-foreground">Year {c.year} · Semester {c.semester}</p>
              </a>
            ))}
          </div>
        </div>
      )}
    </ProfessorLayout>
  );
};

export default ProfessorDashboard;
