import ProfessorLayout from "@/components/ProfessorLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, UserCheck, BookOpen } from "lucide-react";

const ProfessorAdvisor = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  // Check which programs this professor advises
  const { data: advisorPrograms = [] } = useQuery({
    queryKey: ["prof-advisor-programs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_advisors")
        .select("*")
        .eq("advisor_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const programSlugs = advisorPrograms.map((p) => p.program);

  // Fetch enrollment requests for courses in advised programs
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["advisor-enrollment-requests", programSlugs],
    queryFn: async () => {
      if (programSlugs.length === 0) return [];
      // Get courses in advised programs
      const { data: courses, error: cErr } = await supabase
        .from("courses")
        .select("id, name, code, program")
        .in("program", programSlugs);
      if (cErr) throw cErr;
      if (!courses || courses.length === 0) return [];

      const courseIds = courses.map((c) => c.id);
      const { data: reqs, error: rErr } = await supabase
        .from("enrollment_requests")
        .select("*")
        .in("course_id", courseIds)
        .order("created_at", { ascending: false });
      if (rErr) throw rErr;

      // Get student profiles
      const userIds = [...new Set((reqs || []).map((r) => r.user_id))];
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: pData } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);
        profiles = pData || [];
      }

      return (reqs || []).map((r) => ({
        ...r,
        course: courses.find((c) => c.id === r.course_id),
        student: profiles.find((p) => p.user_id === r.user_id),
      }));
    },
    enabled: programSlugs.length > 0,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("enrollment_requests")
        .update({ status, reviewed_by: user!.id } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["advisor-enrollment-requests"] });
      toast({ title: `Request ${vars.status}` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const processedRequests = requests.filter((r) => r.status !== "pending");

  const statusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600"><CheckCircle className="h-3 w-3" />Accepted</span>;
      case "rejected":
        return <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"><XCircle className="h-3 w-3" />Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600"><Clock className="h-3 w-3" />Pending</span>;
    }
  };

  if (advisorPrograms.length === 0 && !isLoading) {
    return (
      <ProfessorLayout>
        <h1 className="font-display text-2xl font-bold text-foreground">Academic Advisor</h1>
        <div className="mt-6 rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          <UserCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p>You are not currently assigned as an academic advisor for any program.</p>
          <p className="mt-1 text-sm">Contact administration to be assigned.</p>
        </div>
      </ProfessorLayout>
    );
  }

  return (
    <ProfessorLayout>
      <h1 className="font-display text-2xl font-bold text-foreground">Academic Advisor</h1>
      <p className="text-sm text-muted-foreground">
        Review enrollment requests for: {advisorPrograms.map((p) => p.program).join(", ")}
      </p>

      {/* Pending requests */}
      <h2 className="mt-6 mb-3 font-display text-lg font-semibold text-foreground">
        Pending Requests ({pendingRequests.length})
      </h2>
      {pendingRequests.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No pending enrollment requests.
        </div>
      ) : (
        <div className="overflow-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-foreground">Student</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Course</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Date</th>
                <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{r.student?.full_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{r.student?.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-foreground">{r.course?.name}</p>
                    <p className="text-xs text-muted-foreground">{r.course?.code} · {r.course?.program}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => updateMutation.mutate({ id: r.id, status: "accepted" })}
                        className="rounded p-1.5 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600"
                        title="Accept"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => updateMutation.mutate({ id: r.id, status: "rejected" })}
                        className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Reject"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* History */}
      {processedRequests.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 font-display text-lg font-semibold text-foreground">History</h2>
          <div className="overflow-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Student</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Course</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {processedRequests.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">{r.student?.full_name || "Unknown"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.course?.name} ({r.course?.code})</td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(r.updated_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ProfessorLayout>
  );
};

export default ProfessorAdvisor;
