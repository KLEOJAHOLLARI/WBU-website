import StudentLayout from "@/components/StudentLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FileText, Upload, Mail, Clock, Megaphone, BookOpen, GraduationCap } from "lucide-react";

const StudentDashboard = () => {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["student-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: appCount = 0 } = useQuery({
    queryKey: ["student-app-count", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("id");
      if (error) {
        console.error("Error fetching application count:", error);
        return 0;
      }
      return data?.length ?? 0;
    },
    enabled: !!user,
  });

  const { data: enrolledCount = 0 } = useQuery({
    queryKey: ["student-enrolled-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("user_id", user!.id);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: pendingRequestCount = 0 } = useQuery({
    queryKey: ["student-pending-requests-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("enrollment_requests").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("status", "pending");
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: docCount = 0 } = useQuery({
    queryKey: ["student-doc-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("student_documents").select("*", { count: "exact", head: true }).eq("user_id", user!.id);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["student-unread-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("student_messages").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("is_read", false);
      return count ?? 0;
    },
    enabled: !!user,
  });

  // Fetch announcements relevant to student: general, their enrolled courses, or their program
  const { data: announcements = [] } = useQuery({
    queryKey: ["student-announcements", user?.id],
    queryFn: async () => {
      // Get student's enrolled course IDs
      const { data: enrollments } = await supabase.from("enrollments").select("course_id").eq("user_id", user!.id);
      const courseIds = (enrollments || []).map((e) => e.course_id);

      // Fetch all announcements, then filter client-side for relevance
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;

      return (data || []).filter((a: any) => {
        // General announcements (no course, no program)
        if (!a.course_id && !a.program) return true;
        // Course-specific: student must be enrolled
        if (a.course_id && courseIds.includes(a.course_id)) return true;
        // Program-specific: show all (student may not have a program field yet)
        if (a.program && !a.course_id) return true;
        return false;
      });
    },
    enabled: !!user,
  });

  const cards = [
    { label: "Enrolled Courses", value: enrolledCount, icon: BookOpen, color: "text-primary" },
    { label: "Pending Requests", value: pendingRequestCount, icon: Clock, color: "text-amber-600" },
    { label: "Applications", value: appCount, icon: FileText, color: "text-primary" },
    { label: "Documents", value: docCount, icon: Upload, color: "text-accent" },
    { label: "Unread Messages", value: unreadCount, icon: Mail, color: "text-destructive" },
  ];

  return (
    <StudentLayout>
      <h1 className="font-display text-2xl font-bold text-foreground">
        Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}!
      </h1>
      <p className="mt-1 text-muted-foreground">Your student portal overview</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-6">
            <c.icon className={`mb-2 h-6 w-6 ${c.color}`} />
            <p className="font-display text-3xl font-bold text-foreground">{c.value}</p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Announcements */}
      <div className="mt-8">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
          <Megaphone className="h-5 w-5 text-primary" /> Announcements
        </h2>
        {announcements.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No announcements at this time.
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((a: any) => (
              <div key={a.id} className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-display font-semibold text-foreground">{a.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">{a.body}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>By {a.author_name}</span>
                  <span>·</span>
                  <span>{new Date(a.created_at).toLocaleString()}</span>
                  {a.program && <><span>·</span><span>{a.program}</span></>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-5 w-5" />
          <span className="text-sm">Quick tip: Upload your required documents and track your application status from the sidebar.</span>
        </div>
      </div>
    </StudentLayout>
  );
};

export default StudentDashboard;
