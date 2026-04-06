import StudentLayout from "@/components/StudentLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FileText, Upload, Mail, Clock } from "lucide-react";

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
      const { count } = await supabase.from("applications").select("*", { count: "exact", head: true }).eq("user_id", user!.id);
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

  const cards = [
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

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-6">
            <c.icon className={`mb-2 h-6 w-6 ${c.color}`} />
            <p className="font-display text-3xl font-bold text-foreground">{c.value}</p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
          </div>
        ))}
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
