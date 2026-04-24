import ProfessorLayout from "@/components/ProfessorLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  Building2,
  GraduationCap,
  ChevronRight,
  User,
  Hash,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useHighlightParam, highlightClasses } from "@/hooks/useHighlightParam";

type Req = {
  id: string;
  user_id: string;
  course_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  updated_at: string;
  course?: {
    id: string;
    name: string;
    code: string;
    program: string;
    ects: number;
  };
  student?: {
    user_id: string;
    full_name: string;
    email: string;
    program: string | null;
    student_id: string | null;
  };
};

const ProfessorAdvisor = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

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

  const { data: programDetails = [] } = useQuery({
    queryKey: ["advisor-program-details", programSlugs],
    queryFn: async () => {
      if (programSlugs.length === 0) return [];
      const { data, error } = await supabase
        .from("programs")
        .select("slug, title, faculty")
        .in("slug", programSlugs);
      if (error) throw error;
      return data || [];
    },
    enabled: programSlugs.length > 0,
  });

  const { data: requests = [], isLoading } = useQuery<Req[]>({
    queryKey: ["advisor-enrollment-requests", programSlugs],
    queryFn: async () => {
      if (programSlugs.length === 0) return [];
      const { data: courses, error: cErr } = await supabase
        .from("courses")
        .select("id, name, code, program, ects")
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

      const userIds = [...new Set((reqs || []).map((r) => r.user_id))];
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: pData } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, program, student_id")
          .in("user_id", userIds);
        profiles = pData || [];
      }

      return (reqs || []).map((r) => ({
        ...r,
        course: courses.find((c) => c.id === r.course_id),
        student: profiles.find((p) => p.user_id === r.user_id),
      })) as Req[];
    },
    enabled: programSlugs.length > 0,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: "accepted" | "rejected" }) => {
      const { error } = await supabase
        .from("enrollment_requests")
        .update({ status, reviewed_by: user!.id } as any)
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["advisor-enrollment-requests"] });
      qc.invalidateQueries({ queryKey: ["prof-pending-enrollment-count"] });
      toast({
        title: vars.status === "accepted" ? "Approved" : "Rejected",
        description: `${vars.ids.length} course${vars.ids.length > 1 ? "s" : ""} updated.`,
      });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const processedRequests = requests.filter((r) => r.status !== "pending");

  // Group pending by student
  const groupedByStudent = pendingRequests.reduce<Record<string, Req[]>>((acc, r) => {
    const key = r.user_id;
    (acc[key] ||= []).push(r);
    return acc;
  }, {});

  const { isHighlighted } = useHighlightParam("request", "req", requests.length > 0);

  const statusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/25 hover:bg-emerald-500/15">
            <CheckCircle className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="destructive"
            className="bg-destructive/15 text-destructive border-destructive/25 hover:bg-destructive/15"
          >
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/25 hover:bg-amber-500/15">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
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

  const studentEntries = Object.entries(groupedByStudent);

  return (
    <ProfessorLayout>
      <h1 className="font-display text-2xl font-bold text-foreground">Academic Advisor</h1>
      <p className="text-sm text-muted-foreground">
        Review course registration requests grouped by student.
      </p>

      {/* Program context */}
      <div className="mt-4 flex flex-wrap gap-3">
        {programDetails.map((p) => (
          <div key={p.slug} className="inline-flex items-center gap-1.5 text-sm">
            <div className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-2.5 py-1">
              <Building2 className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground text-xs">{p.faculty}</span>
            </div>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <div className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1">
              <GraduationCap className="h-3 w-3 text-primary" />
              <span className="font-medium text-foreground text-xs">{p.title}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <Clock className="h-5 w-5 text-amber-600 mb-1" />
          <p className="font-display text-2xl font-bold text-foreground">{studentEntries.length}</p>
          <p className="text-xs text-muted-foreground">
            Student{studentEntries.length === 1 ? "" : "s"} pending ({pendingRequests.length} courses)
          </p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <CheckCircle className="h-5 w-5 text-emerald-600 mb-1" />
          <p className="font-display text-2xl font-bold text-foreground">
            {processedRequests.filter((r) => r.status === "accepted").length}
          </p>
          <p className="text-xs text-muted-foreground">Approved</p>
        </div>
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <XCircle className="h-5 w-5 text-destructive mb-1" />
          <p className="font-display text-2xl font-bold text-foreground">
            {processedRequests.filter((r) => r.status === "rejected").length}
          </p>
          <p className="text-xs text-muted-foreground">Rejected</p>
        </div>
      </div>

      {/* Pending grouped by student */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-display text-lg font-semibold text-foreground">Pending Registrations</h2>
          {studentEntries.length > 0 && (
            <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/25 hover:bg-amber-500/15">
              {studentEntries.length} student{studentEntries.length === 1 ? "" : "s"}
            </Badge>
          )}
        </div>

        {studentEntries.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            <CheckCircle className="mx-auto mb-2 h-8 w-8 text-emerald-500/50" />
            No pending registrations. All caught up!
          </div>
        ) : (
          <div className="space-y-4">
            {studentEntries.map(([userId, items]) => {
              const student = items[0].student;
              const totalEcts = items.reduce((s, r) => s + (r.course?.ects || 0), 0);
              const allIds = items.map((r) => r.id);
              const isHighlightedCard = items.some((r) => isHighlighted(r.id));

              return (
                <div
                  key={userId}
                  id={`req-${items[0].id}`}
                  className={`rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-sm ${
                    isHighlightedCard ? highlightClasses : ""
                  }`}
                >
                  {/* Student header */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border bg-muted/30 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {student?.full_name || "Unknown student"}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {student?.student_id && (
                            <span className="inline-flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              {student.student_id}
                            </span>
                          )}
                          {student?.email && <span>{student.email}</span>}
                          {student?.program && (
                            <span className="inline-flex items-center gap-1">
                              <GraduationCap className="h-3 w-3" />
                              {student.program}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-primary/10 text-primary border-primary/25 hover:bg-primary/10">
                        <Layers className="h-3 w-3 mr-1" />
                        {items.length} course{items.length > 1 ? "s" : ""} · {totalEcts} ECTS
                      </Badge>
                      <button
                        onClick={() =>
                          updateMutation.mutate({ ids: allIds, status: "accepted" })
                        }
                        disabled={updateMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition-all hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Approve all
                      </button>
                      <button
                        onClick={() =>
                          updateMutation.mutate({ ids: allIds, status: "rejected" })
                        }
                        disabled={updateMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3.5 py-2 text-xs font-semibold text-destructive transition-all hover:bg-destructive/10 disabled:opacity-60"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject all
                      </button>
                    </div>
                  </div>

                  {/* Course list */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/20 border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-5 py-2.5 text-left font-medium">Code</th>
                          <th className="px-5 py-2.5 text-left font-medium">Course</th>
                          <th className="px-5 py-2.5 text-left font-medium">ECTS</th>
                          <th className="px-5 py-2.5 text-left font-medium">Requested</th>
                          <th className="px-5 py-2.5 text-right font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((r) => (
                          <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                            <td className="px-5 py-2.5">
                              <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                {r.course?.code || "—"}
                              </span>
                            </td>
                            <td className="px-5 py-2.5 font-medium text-foreground">
                              {r.course?.name || "—"}
                            </td>
                            <td className="px-5 py-2.5">{r.course?.ects ?? "—"}</td>
                            <td className="px-5 py-2.5 text-muted-foreground text-xs">
                              {new Date(r.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-5 py-2.5 text-right">
                              <div className="inline-flex gap-1">
                                <button
                                  onClick={() =>
                                    updateMutation.mutate({
                                      ids: [r.id],
                                      status: "accepted",
                                    })
                                  }
                                  disabled={updateMutation.isPending}
                                  className="inline-flex items-center justify-center rounded-md p-1.5 text-emerald-600 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                                  title="Approve this course"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    updateMutation.mutate({
                                      ids: [r.id],
                                      status: "rejected",
                                    })
                                  }
                                  disabled={updateMutation.isPending}
                                  className="inline-flex items-center justify-center rounded-md p-1.5 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                                  title="Reject this course"
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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History */}
      {processedRequests.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">History</h2>
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
                  <tr
                    key={r.id}
                    id={`req-${r.id}`}
                    className={`border-b border-border last:border-0 ${
                      isHighlighted(r.id) ? highlightClasses : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">
                        {r.student?.full_name || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">{r.student?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground">{r.course?.name}</p>
                      <p className="text-xs text-muted-foreground">{r.course?.code}</p>
                    </td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(r.updated_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ProfessorLayout>
  );
};

export default ProfessorAdvisor;
