import StudentLayout from "@/components/StudentLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const statusColor = (status: string) => {
  switch (status) {
    case "approved": return "bg-green-100 text-green-800";
    case "rejected": return "bg-red-100 text-red-800";
    default: return "bg-accent/20 text-accent-foreground";
  }
};

const StudentApplications = () => {
  const { user } = useAuth();

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["student-applications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Also fetch applications by email as fallback (for apps submitted before registration)
  const { data: emailApps = [] } = useQuery({
    queryKey: ["student-applications-email", user?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("email", user!.email!)
        .is("user_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.email,
  });

  const allApps = [...applications, ...emailApps];

  return (
    <StudentLayout>
      <h1 className="font-display text-2xl font-bold text-foreground">My Applications</h1>
      <p className="text-sm text-muted-foreground">Track the status of your program applications</p>

      <div className="mt-6 space-y-4">
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : allApps.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            <p>No applications found.</p>
            <p className="mt-1 text-sm">Apply to a program from the <a href="/admissions" className="text-primary hover:underline">Admissions</a> page.</p>
          </div>
        ) : (
          allApps.map((app) => (
            <div key={app.id} className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground">{app.program}</h3>
                  <p className="text-sm text-muted-foreground">Applied on {new Date(app.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor(app.status)}`}>
                  {app.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{app.motivation}</p>
            </div>
          ))
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentApplications;
