import { ReactNode } from "react";
import { Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, LayoutDashboard, BookOpen, LogOut, Megaphone, UserCircle, UserCheck } from "lucide-react";

const navItems = [
  { to: "/professor", label: "Dashboard", icon: LayoutDashboard },
  { to: "/professor/courses", label: "My Courses", icon: BookOpen },
  { to: "/professor/advisor", label: "Advisor", icon: UserCheck, badgeKey: "advisor" as const },
  { to: "/professor/announcements", label: "Announcements", icon: Megaphone },
  { to: "/professor/profile", label: "My Profile", icon: UserCircle },
];

const ProfessorLayout = ({ children }: { children: ReactNode }) => {
  const { user, isProfessor, isAdmin, loading, signOut } = useAuth();
  const location = useLocation();

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["pending-enrollment-count", user?.id],
    queryFn: async () => {
      // Get programs this professor advises
      const { data: advisorPrograms } = await supabase
        .from("program_advisors")
        .select("program")
        .eq("advisor_id", user!.id);
      if (!advisorPrograms?.length) return 0;
      const programs = advisorPrograms.map((a) => a.program);
      // Get courses in those programs
      const { data: courses } = await supabase
        .from("courses")
        .select("id")
        .in("program", programs);
      if (!courses?.length) return 0;
      const courseIds = courses.map((c) => c.id);
      // Count pending requests
      const { count } = await supabase
        .from("enrollment_requests")
        .select("*", { count: "exact", head: true })
        .in("course_id", courseIds)
        .eq("status", "pending");
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/portal/login" replace />;
  if (!isProfessor && !isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="font-display text-lg font-bold text-primary">Professor</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                location.pathname === item.to
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive">
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
          <Link to="/" className="mt-1 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">
            ← Back to Site
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
};

export default ProfessorLayout;
