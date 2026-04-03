import AdminLayout from "@/components/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const AdminContacts = () => {
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["admin-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contact_submissions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold text-foreground">Contact Messages</h1>
      <p className="text-sm text-muted-foreground">View messages from the contact form</p>

      <div className="mt-6 space-y-4">
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : submissions.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">No messages yet</p>
        ) : submissions.map((s) => (
          <div key={s.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground">{s.subject}</h3>
                <p className="text-sm text-muted-foreground">{s.name} · {s.email}</p>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.message}</p>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminContacts;
