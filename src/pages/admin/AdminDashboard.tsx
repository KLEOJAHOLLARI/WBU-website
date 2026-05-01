import { useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Newspaper, FileText, Mail, Users, GraduationCap, Clock } from "lucide-react";
import SemesterBadge from "@/components/SemesterBadge";
import { StatCardsSkeleton } from "@/components/admin/AdminSkeleton";
import AdminErrorBanner from "@/components/admin/AdminErrorBanner";
import { toast } from "sonner";

const AdminDashboard = () => {
  const programs = useQuery({
    queryKey: ["admin-programs-count"],
    queryFn: async () => {
      const { count } = await supabase.from("programs").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: newsCount = 0 } = useQuery({
    queryKey: ["admin-news-count"],
    queryFn: async () => {
      const { count } = await supabase.from("news_articles").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: appCount = 0 } = useQuery({
    queryKey: ["admin-apps-count"],
    queryFn: async () => {
      const { count } = await supabase.from("applications").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: contactCount = 0 } = useQuery({
    queryKey: ["admin-contacts-count"],
    queryFn: async () => {
      const { count } = await supabase.from("contact_submissions").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: courseCount = 0 } = useQuery({
    queryKey: ["admin-courses-count"],
    queryFn: async () => {
      const { count } = await supabase.from("courses").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: professorCount = 0 } = useQuery({
    queryKey: ["admin-professors-count"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*").eq("role", "professor");
      return data?.length ?? 0;
    },
  });

  const { data: pendingStudents = 0 } = useQuery({
    queryKey: ["admin-pending-students"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("account_status").eq("account_status", "pending");
      return data?.length ?? 0;
    },
  });

  const cards = [
    { label: "Programs", value: programCount, icon: BookOpen },
    { label: "Courses", value: courseCount, icon: BookOpen },
    { label: "Professors", value: professorCount, icon: Users },
    { label: "Pending Students", value: pendingStudents, icon: Clock },
    { label: "News Articles", value: newsCount, icon: Newspaper },
    { label: "Applications", value: appCount, icon: FileText },
    { label: "Messages", value: contactCount, icon: Mail },
  ];

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Overview of your university management system</p>
      <div className="mt-2"><SemesterBadge /></div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-6">
            <c.icon className="mb-2 h-6 w-6 text-accent" />
            <p className="font-display text-3xl font-bold text-foreground">{c.value}</p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
