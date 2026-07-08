import StudentLayout from "@/components/StudentLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, GraduationCap } from "lucide-react";

type Row = {
  enrollment_id: string;
  course_id: string;
  course_name: string;
  course_code: string;
  original_grade: number | null;
  resit_id: string | null;
  resit_grade: number | null;
  final_grade: number | null;
  status: string;
  exam_date: string | null;
};

const statusBadge = (s: string) => {
  if (s === "graded") return <Badge variant="default">Completed</Badge>;
  if (s === "registered") return <Badge variant="secondary">Registered</Badge>;
  if (s === "cancelled") return <Badge variant="outline">Cancelled</Badge>;
  return <Badge variant="outline">Available</Badge>;
};

const StudentResits = () => {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery<Row[]>({
    queryKey: ["my-resits"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_resit_view");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const register = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { data, error } = await supabase.rpc("register_for_resit", {
        _enrollment_id: enrollmentId,
      });
      if (error) throw error;
      const r = data as any;
      if (!r?.ok) throw new Error(r?.reason || "Failed");
      return r;
    },
    onSuccess: () => {
      toast({ title: "Registered for resit exam" });
      qc.invalidateQueries({ queryKey: ["my-resits"] });
    },
    onError: (e: any) => {
      const msg =
        e.message === "not_eligible"
          ? "You are not eligible for a resit exam."
          : e.message === "already_registered"
          ? "You are already registered for this resit."
          : e.message === "no_final_grade"
          ? "No final grade recorded yet."
          : e.message;
      toast({ title: "Cannot register", description: msg, variant: "destructive" });
    },
  });

  const eligible = data.filter((r) => !r.resit_id);
  const registered = data.filter((r) => r.resit_id);

  return (
    <StudentLayout>
      <div className="flex items-center gap-3">
        <RefreshCw className="h-6 w-6 text-primary" />
        <h1 className="font-display text-2xl font-bold">Resit Exams</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Register for a resit on eligible courses (final grade 4–7). Maximum grade after a resit is 8.
      </p>

      {isLoading ? (
        <p className="mt-6 text-muted-foreground">Loading…</p>
      ) : (
        <div className="mt-6 grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Eligible Courses</CardTitle>
              <CardDescription>Courses where you scored 4, 5, 6, or 7.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {eligible.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  No eligible courses. You are only eligible for a resit if your final grade is 4–7.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {eligible.map((r) => {
                    const eligibleGrade =
                      r.original_grade != null && r.original_grade >= 4 && r.original_grade <= 7;
                    return (
                      <div
                        key={r.enrollment_id}
                        className="flex items-center justify-between gap-3 p-4"
                      >
                        <div>
                          <p className="font-medium">{r.course_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.course_code} · Original grade:{" "}
                            <span className="font-semibold text-destructive">
                              {r.original_grade ?? "—"}
                            </span>
                          </p>
                        </div>
                        {eligibleGrade ? (
                          <Button
                            size="sm"
                            onClick={() => register.mutate(r.enrollment_id)}
                            disabled={register.isPending}
                          >
                            Register for Resit
                          </Button>
                        ) : (
                          <div className="text-right">
                            <Button size="sm" disabled>
                              Register for Resit
                            </Button>
                            <p className="mt-1 text-xs text-muted-foreground">
                              You are not eligible for a resit exam.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base inline-flex items-center gap-2">
                <GraduationCap className="h-4 w-4" /> My Resit Registrations
              </CardTitle>
              <CardDescription>Status of each resit exam.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium">Course</th>
                      <th className="px-4 py-2.5 text-left font-medium">Original</th>
                      <th className="px-4 py-2.5 text-left font-medium">Resit</th>
                      <th className="px-4 py-2.5 text-left font-medium">Final</th>
                      <th className="px-4 py-2.5 text-left font-medium">Exam Date</th>
                      <th className="px-4 py-2.5 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          No resit registrations yet.
                        </td>
                      </tr>
                    ) : (
                      registered.map((r) => (
                        <tr key={r.resit_id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2">
                            <p className="font-medium">{r.course_name}</p>
                            <p className="text-xs text-muted-foreground">{r.course_code}</p>
                          </td>
                          <td className="px-4 py-2">{r.original_grade ?? "—"}</td>
                          <td className="px-4 py-2">{r.resit_grade ?? "—"}</td>
                          <td className="px-4 py-2 font-semibold">
                            {r.final_grade ?? "—"}
                            {r.status === "graded" && (
                              <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                                (after resit)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {r.exam_date ? new Date(r.exam_date).toLocaleDateString() : "TBA"}
                          </td>
                          <td className="px-4 py-2">{statusBadge(r.status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </StudentLayout>
  );
};

export default StudentResits;
