import AdminLayout from "@/components/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Newspaper, FileText, Mail } from "lucide-react";

const AdminDashboard = () => {
  const { data: programCount = 0 } = useQuery({
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

  const cards = [
    { label: "Programs", value: programCount, icon: BookOpen },
    { label: "News Articles", value: newsCount, icon: Newspaper },
    { label: "Applications", value: appCount, icon: FileText },
    { label: "Messages", value: contactCount, icon: Mail },
  ];

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Overview of your university management system</p>

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
