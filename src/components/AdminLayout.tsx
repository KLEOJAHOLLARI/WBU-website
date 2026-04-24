import { ReactNode, useState } from "react";
import { Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  GraduationCap, LayoutDashboard, BookOpen, Newspaper, Mail, FileText, Users,
  LogOut, CalendarDays, UserPlus, Megaphone, UserCircle, UserCheck, Menu, ScrollText, ArrowLeft,
  BarChart3, Calendar, CreditCard, ShieldCheck,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import NotificationBell from "@/components/NotificationBell";
import GlobalSearch from "@/components/GlobalSearch";

type BadgeKey = "applications" | "enrollments";

const navGroups: { label: string; items: { to: string; label: string; icon: any; badgeKey?: BadgeKey }[] }[] = [
  {
    label: "Main",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/programs", label: "Programs", icon: BookOpen },
      { to: "/admin/courses", label: "Courses", icon: BookOpen },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/admin/accounts", label: "Accounts", icon: UserPlus },
      { to: "/admin/professors", label: "Professors", icon: Users },
      { to: "/admin/students", label: "Students", icon: Users },
      { to: "/admin/advisors", label: "Advisors", icon: UserCheck },
    ],
  },
  {
    label: "Academic",
    items: [
      { to: "/admin/applications", label: "Applications", icon: FileText, badgeKey: "applications" },
      { to: "/admin/transcripts", label: "Transcripts", icon: ScrollText },
      { to: "/admin/transcripts/settings", label: "Transcript Settings", icon: ShieldCheck },
      { to: "/admin/timetable", label: "Timetable", icon: CalendarDays },
      { to: "/admin/exams", label: "Exam Schedule", icon: CalendarDays },
      { to: "/admin/graduation", label: "Graduation", icon: GraduationCap },
      { to: "/admin/semesters", label: "Semesters", icon: Calendar },
      { to: "/admin/tuition", label: "Tuition", icon: CreditCard },
    ],
  },
  {
    label: "Communication",
    items: [
      { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
      { to: "/admin/news", label: "News", icon: Newspaper },
      { to: "/admin/promo-banners", label: "Promo Banners", icon: Megaphone },
      { to: "/admin/contacts", label: "Messages", icon: Mail },
    ],
  },
  {
    label: "Insights",
    items: [
      { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Settings",
    items: [
      { to: "/admin/profile", label: "My Profile", icon: UserCircle },
    ],
  },
];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { user, isAdmin, loading, signOut, profile } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const initials = (profile?.full_name || "A").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const sidebarContent = (
    <>
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <GraduationCap className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-display text-base font-semibold text-foreground">Admin Panel</span>
      </div>

      <nav className="flex-1 overflow-auto px-3 py-4">
        {navGroups.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? "mt-6" : ""}>
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = location.pathname === item.to;
                const count = item.badgeKey ? badges[item.badgeKey] : 0;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground"}`} />
                    <span className="truncate">{item.label}</span>
                    {count > 0 && (
                      <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                        {count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border p-3 space-y-0.5">
        <button
          onClick={() => { signOut(); setMobileOpen(false); }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
        <Link
          to="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Site
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        {sidebarContent}
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="flex h-14 items-center justify-between border-b border-border bg-card px-4 md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button className="md:hidden rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 flex flex-col">
              {sidebarContent}
            </SheetContent>
          </Sheet>
          <div className="hidden md:block flex-1" />

          <div className="flex items-center gap-2">
            <GlobalSearch />
            <NotificationBell />
            <div className="text-right hidden sm:block ml-2">
              <p className="text-sm font-medium text-foreground leading-tight">{profile?.full_name || "Admin"}</p>
              <p className="text-xs text-muted-foreground">Admin</p>
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

export default AdminLayout;
