import { useQuery } from "@tanstack/react-query";
import ProfessorLayout from "@/components/ProfessorLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Award, Calendar, Clock, MessageCircle } from "lucide-react";

const ratingFor = (score: number | null | undefined) => {
  if (score === null || score === undefined) return { label: "No data", className: "bg-muted text-muted-foreground" };
  if (score >= 80) return { label: "Excellent", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" };
  if (score >= 60) return { label: "Good", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400" };
  return { label: "Needs Improvement", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" };
};

const ProfessorPerformance = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["my-perf", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_professor_performance", {
        _professor_id: user!.id,
        _semester_id: null,
      });
      if (error) throw error;
      return data as any;
    },
    enabled: !!user,
  });

  const rating = ratingFor(data?.performance_score);

  return (
    <ProfessorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">My Performance</h1>
          <p className="text-muted-foreground mt-1">
            Your aggregate performance score based on student feedback, attendance consistency, and grading timeliness.
            All student feedback is anonymous.
          </p>
        </div>

        {isLoading || !data ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : !data.ok ? (
          <p className="text-muted-foreground">Unable to load performance data.</p>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Overall Score</CardTitle>
                <Badge variant="outline" className={rating.className}>{rating.label}</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-bold">{Math.round(data.performance_score || 0)}<span className="text-2xl text-muted-foreground">/100</span></div>
                <Progress value={data.performance_score || 0} className="mt-4 h-2" />
                <p className="text-xs text-muted-foreground mt-3">
                  Formula: 50% feedback · 25% attendance · 25% grading timeliness
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><MessageCircle className="h-4 w-4" /> Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{data.feedback_score === null ? "—" : Math.round(data.feedback_score)}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {data.feedback_avg}/5 avg · {data.feedback_count} response{data.feedback_count === 1 ? "" : "s"}
                  </p>
                  <Progress value={data.feedback_score || 0} className="mt-3 h-1.5" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><Calendar className="h-4 w-4" /> Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{data.attendance_score === null ? "—" : Math.round(data.attendance_score)}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {data.attendance_recorded} / {data.attendance_expected} sessions recorded
                  </p>
                  <Progress value={data.attendance_score || 0} className="mt-3 h-1.5" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4" /> Grading</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{data.grading_score === null ? "—" : Math.round(data.grading_score)}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Avg delay: {data.avg_grading_delay_days} day{data.avg_grading_delay_days === 1 ? "" : "s"}
                  </p>
                  <Progress value={data.grading_score || 0} className="mt-3 h-1.5" />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Anonymous Feedback Comments</CardTitle>
              </CardHeader>
              <CardContent>
                {(data.comments || []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">No feedback comments yet.</p>
                ) : (
                  <div className="space-y-3">
                    {(data.comments as any[]).map((c, i) => (
                      <div key={i} className="rounded-lg border p-4">
                        <div className="text-xs text-muted-foreground mb-1">★ {c.rating}/5 · {new Date(c.created_at).toLocaleDateString()}</div>
                        <p className="text-sm">{c.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ProfessorLayout>
  );
};

export default ProfessorPerformance;
