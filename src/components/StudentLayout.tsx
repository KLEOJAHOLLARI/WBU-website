import { ReactNode } from "react";
import { Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { GraduationCap, LayoutDashboard, FileText, Upload, Mail, LogOut, CalendarDays, BookOpen } from "lucide-react";

const navItems = [
  { to: "/portal", label: "Dashboard", icon: LayoutDashboard },
  { to: "/portal/courses", label: "My Courses", icon: BookOpen },
  { to: "/portal/applications", label: "My Applications", icon: FileText },
  { to: "/portal/documents", label: "Documents", icon: Upload },
  { to: "/portal/timetable", label: "Timetable", icon: CalendarDays },
  { to: "/portal/messages", label: "Messages", icon: Mail },
];

const StudentLayout = ({ children }: { children: ReactNode }) => {
  const { user, isAdmin, isProfessor, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/portal/login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (isProfessor) return <Navigate to="/professor" replace />;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-64 flex-col border-r border-border bg-card">
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="font-display text-lg font-bold text-primary">Student Portal</span>
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
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
};

export default StudentLayout;
