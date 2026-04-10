import { ReactNode, useState } from "react";
import { Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, LayoutDashboard, BookOpen, LogOut, Megaphone, UserCircle, UserCheck, Menu, ScrollText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { to: "/professor", label: "Dashboard", icon: LayoutDashboard },
  { to: "/professor/courses", label: "My Courses", icon: BookOpen },
  { to: "/professor/advisor", label: "Advisor", icon: UserCheck, badgeKey: "advisor" as const },
  { to: "/professor/transcripts", label: "Transcripts", icon: ScrollText },
  { to: "/professor/announcements", label: "Announcements", icon: Megaphone },
  { to: "/professor/profile", label: "My Profile", icon: UserCircle },
];

const ProfessorLayout = ({ children }: { children: ReactNode }) => {
  const { user, isProfessor, isAdmin, loading, signOut, profile } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["pending-enrollment-count", user?.id],
    queryFn: async () => {
      const { data: advisorPrograms } = await supabase
        .from("program_advisors")
        .select("program")
        .eq("advisor_id", user!.id);
      if (!advisorPrograms?.length) return 0;
      const programs = advisorPrograms.map((a) => a.program);
      const { data: courses } = await supabase
        .from("courses")
        .select("id")
        .in("program", programs);
      if (!courses?.length) return 0;
      const courseIds = courses.map((c) => c.id);
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

  const initials = (profile?.full_name || "P").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <GraduationCap className="h-6 w-6 text-primary" />
        <span className="font-display text-lg font-bold text-primary">Professor</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-auto p-3">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
              location.pathname === item.to
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
            {item.badgeKey === "advisor" && pendingCount > 0 && (
              <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                {pendingCount}
              </span>
            )}
          </Link>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <button onClick={() => { signOut(); setMobileOpen(false); }} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive">
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
        <Link to="/" onClick={() => setMobileOpen(false)} className="mt-1 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">
          ← Back to Site
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        {sidebarContent}
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="flex h-14 items-center justify-between border-b border-border bg-card px-4 md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button className="md:hidden rounded-md p-2 text-muted-foreground hover:bg-secondary transition-colors">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 flex flex-col">
              {sidebarContent}
            </SheetContent>
          </Sheet>
          <div className="hidden md:block" />

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground leading-tight">{profile?.full_name || "Professor"}</p>
              <p className="text-xs text-muted-foreground">Professor</p>
            </div>
            <Avatar className="h-8 w-8">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name} />}
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
          </div>
        </div>
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
};

export default ProfessorLayout;
