import { ReactNode } from "react";
import { Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, LayoutDashboard, BookOpen, Newspaper, Mail, FileText, Users, LogOut, CalendarDays, UserPlus, Megaphone, UserCircle, UserCheck } from "lucide-react";

type BadgeKey = "applications" | "enrollments";

const navItems: { to: string; label: string; icon: any; badgeKey?: BadgeKey }[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/programs", label: "Programs", icon: BookOpen },
  { to: "/admin/courses", label: "Courses", icon: BookOpen },
  { to: "/admin/advisors", label: "Advisors", icon: UserCheck },
  { to: "/admin/accounts", label: "Accounts", icon: UserPlus },
  { to: "/admin/professors", label: "Professors", icon: Users },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/admin/news", label: "News", icon: Newspaper },
  { to: "/admin/applications", label: "Applications", icon: FileText, badgeKey: "applications" },
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/timetable", label: "Timetable", icon: CalendarDays },
  { to: "/admin/contacts", label: "Messages", icon: Mail },
  { to: "/admin/profile", label: "My Profile", icon: UserCircle },
];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const location = useLocation();

  const { data: pendingApps = 0 } = useQuery({
    queryKey: ["admin-pending-applications"],
    queryFn: async () => {
      const { count } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const badges: Record<BadgeKey, number> = {
    applications: pendingApps,
    enrollments: 0,
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Loading...</div>;
  if (!user || !isAdmin) return <Navigate to="/admin/login" replace />;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-64 flex-col border-r border-border bg-card">
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="font-display text-lg font-bold text-primary">Admin</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const count = item.badgeKey ? badges[item.badgeKey] : 0;
            return (
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
                {count > 0 && (
                  <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
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
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;
