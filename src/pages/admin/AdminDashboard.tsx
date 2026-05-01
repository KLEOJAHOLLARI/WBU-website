import { useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Newspaper, FileText, Mail, Users, Clock } from "lucide-react";
import SemesterBadge from "@/components/SemesterBadge";
import { StatCardsSkeleton } from "@/components/admin/AdminSkeleton";
import AdminErrorBanner from "@/components/admin/AdminErrorBanner";
import { toast } from "sonner";

const countQuery = (key: string, table: any) => ({
  queryKey: [key],
  queryFn: async () => {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error) throw error;
    return count ?? 0;
  },
});

const AdminDashboard = () => {
  const programs = useQuery(countQuery("admin-programs-count", "programs"));
  const news = useQuery(countQuery("admin-news-count", "news_articles"));
  const apps = useQuery(countQuery("admin-apps-count", "applications"));
  const contacts = useQuery(countQuery("admin-contacts-count", "contact_submissions"));
  const courses = useQuery(countQuery("admin-courses-count", "courses"));

  const professors = useQuery({
    queryKey: ["admin-professors-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*").eq("role", "professor");
      if (error) throw error;
      return data?.length ?? 0;
    },
  });

  const pending = useQuery({
    queryKey: ["admin-pending-students"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("account_status").eq("account_status", "pending");
      if (error) throw error;
      return data?.length ?? 0;
    },
  });

  const queries = [programs, courses, professors, pending, news, apps, contacts];
  const isLoading = queries.some((q) => q.isLoading);
  const firstError = queries.find((q) => q.error)?.error;

  useEffect(() => {
    if (firstError) toast.error("Failed to load dashboard data");
  }, [firstError]);

  const refetchAll = () => queries.forEach((q) => q.refetch());

  const cards = [
    { label: "Programs", value: programs.data ?? 0, icon: BookOpen },
    { label: "Courses", value: courses.data ?? 0, icon: BookOpen },
    { label: "Professors", value: professors.data ?? 0, icon: Users },
    { label: "Pending Students", value: pending.data ?? 0, icon: Clock },
    { label: "News Articles", value: news.data ?? 0, icon: Newspaper },
    { label: "Applications", value: apps.data ?? 0, icon: FileText },
    { label: "Messages", value: contacts.data ?? 0, icon: Mail },
  ];

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Overview of your university management system</p>
      <div className="mt-2"><SemesterBadge /></div>

      {firstError && (
        <div className="mt-6">
          <AdminErrorBanner error={firstError} onRetry={refetchAll} />
        </div>
      )}

      <div className="mt-8">
        {isLoading ? (
          <StatCardsSkeleton count={7} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => (
              <div key={c.label} className="rounded-xl border border-border bg-card p-6">
                <c.icon className="mb-2 h-6 w-6 text-accent" />
                <p className="font-display text-3xl font-bold text-foreground">{c.value}</p>
                <p className="text-sm text-muted-foreground">{c.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
