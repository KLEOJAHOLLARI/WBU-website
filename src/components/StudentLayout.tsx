import { ReactNode, useState } from "react";
import { Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  GraduationCap, LayoutDashboard, FileText, Upload, Mail, LogOut,
  CalendarDays, BookOpen, UserCircle, Menu, ScrollText, ArrowLeft, ClipboardList, CreditCard, Calculator, ClipboardEdit, IdCard, History, Bell, RefreshCw, Star, ClipboardCheck, Armchair, Clock, Briefcase,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useActiveSemester } from "@/hooks/useActiveSemester";
import { usePortalNavVisibility, usePortalNavOrder } from "@/hooks/usePortalNavVisibility";


import NotificationBell from "@/components/NotificationBell";
import GlobalSearch from "@/components/GlobalSearch";

const buildNavGroups = (registrationOpen: boolean) => [
  {
    label: "Main",
    items: [
      { to: "/portal", label: "Dashboard", icon: LayoutDashboard },
      { to: "/portal/courses", label: "My Courses", icon: BookOpen },
      { to: "/portal/assignments", label: "Assignments", icon: ClipboardCheck },
      { to: "/portal/seating", label: "My Seating", icon: Armchair },
      { to: "/portal/office-hours", label: "Office Hours", icon: Clock },
      { to: "/portal/events", label: "Events", icon: CalendarDays },
      { to: "/portal/internships", label: "Internships", icon: Briefcase },
      ...(registrationOpen
        ? [
            { to: "/portal/registration", label: "Course Registration", icon: ClipboardEdit },
            { to: "/portal/retake", label: "Retake Courses", icon: RefreshCw },
          ]
        : []),
    ],
  },
  {
    label: "Academic",
    items: [
      { to: "/portal/transcript", label: "Transcript", icon: ScrollText },
      { to: "/portal/timetable", label: "Timetable", icon: CalendarDays },
      { to: "/portal/exams", label: "Exam Schedule", icon: ClipboardList },
      { to: "/portal/tuition", label: "Tuition", icon: CreditCard },
      { to: "/portal/tuition/estimate", label: "Tuition Estimate", icon: Calculator },
      { to: "/portal/documents", label: "Documents", icon: Upload },
      ...(registrationOpen
        ? [{ to: "/portal/feedback", label: "Professor Feedback", icon: Star }]
        : []),
    ],
  },
  {
    label: "Other",
    items: [
      { to: "/portal/id-card", label: "Digital ID Card", icon: IdCard },
      { to: "/portal/access-history", label: "Access History", icon: History },
      { to: "/portal/messages", label: "Messages", icon: Mail, badge: true },
      { to: "/portal/notifications", label: "Notifications", icon: Bell },
      { to: "/portal/profile", label: "My Profile", icon: UserCircle },
    ],
  },
];

const StudentLayout = ({ children }: { children: ReactNode }) => {
  const { user, isAdmin, isProfessor, loading, signOut, profile } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: activeSemester } = useActiveSemester();
  const isVisible = usePortalNavVisibility("student");
  const rawGroups = buildNavGroups(!!activeSemester?.enrollment_open);
  const navGroups = rawGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => i.to === "/portal" || isVisible(i.to)) }))
    .filter((g) => g.items.length > 0);


  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["student-unread-messages", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("student_messages")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/portal/login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (isProfessor) return <Navigate to="/professor" replace />;

  const initials = (profile?.full_name || "S").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <GraduationCap className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-display text-base font-semibold text-foreground">Student Portal</span>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-auto px-3 py-4">
        {navGroups.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? "mt-6" : ""}>
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = location.pathname === item.to;
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
                    {"badge" in item && item.badge && unreadCount > 0 && (
                      <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
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
      {/* Desktop sidebar */}
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
              <p className="text-sm font-medium text-foreground leading-tight">{profile?.full_name || "Student"}</p>
              <p className="text-xs text-muted-foreground">Student</p>
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

export default StudentLayout;
