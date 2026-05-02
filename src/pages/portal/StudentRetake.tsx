import { useMemo, useState } from "react";
import StudentLayout from "@/components/StudentLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useFailedCourses, useRetakeSettings } from "@/hooks/useFailedCourses";
import { useActiveSemester } from "@/hooks/useActiveSemester";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  History,
  Inbox,
  GraduationCap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { gradeToAlbanian, gradeToLetter } from "@/lib/transcript";

const StudentRetake = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: activeSemester } = useActiveSemester();
  const { data: failed = [], isLoading: failedLoading } = useFailedCourses();
  const { data: settings } = useRetakeSettings();

  // Existing retake requests
  const { data: retakeRequests = [], isLoading: rrLoading } = useQuery({
    queryKey: ["my-retake-requests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_retake_requests")
        .select(
          "id, course_id, status, attempt_number, previous_grade, previous_albanian, advisor_comment, reviewed_at, created_at, target_semester_id, courses:course_id(id, name, code, ects, semester, year), academic_semesters:target_semester_id(id, name)"
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const requestedCourseIds = useMemo(
    () => new Set(retakeRequests.filter((r) => r.status === "pending").map((r) => r.course_id)),
    [retakeRequests],
  );

  // Count attempts per course (including approved retakes that are now enrolled)
  const { data: attemptCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["my-attempt-counts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("course_id, attempt_number")
        .eq("user_id", user!.id);
      const m: Record<string, number> = {};
      (data || []).forEach((e: any) => {
        m[e.course_id] = Math.max(m[e.course_id] || 0, e.attempt_number || 1);
      });
      return m;
    },
  });

  const submitRetake = useMutation({
    mutationFn: async (course: (typeof failed)[number]) => {
      if (!settings?.enabled) throw new Error("Retake system is currently disabled");
      const usedAttempts = attemptCounts[course.courseId] || 1;
      if (usedAttempts >= settings.max_attempts) {
        throw new Error(
          `Maximum ${settings.max_attempts} attempts reached for ${course.courseName}.`,
        );
      }
      const { error } = await supabase.from("course_retake_requests").insert({
        user_id: user!.id,
        course_id: course.courseId,
        original_enrollment_id: course.enrollmentId,
        target_semester_id: activeSemester?.id || null,
        attempt_number: usedAttempts + 1,
        previous_grade: course.grade,
        previous_albanian: gradeToAlbanian(course.grade),
        fee_amount: settings.fee_amount,
        fee_currency: settings.fee_currency,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Retake request sent",
        description: "Your academic advisor will review the request.",
      });
      qc.invalidateQueries({ queryKey: ["my-retake-requests"] });
    },
    onError: (e: any) =>
      toast({ title: "Could not submit", description: e.message, variant: "destructive" }),
  });

  const cancelRetake = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("course_retake_requests")
        .update({ status: "cancelled" } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Retake request cancelled" });
      qc.invalidateQueries({ queryKey: ["my-retake-requests"] });
    },
    onError: (e: any) =>
      toast({ title: "Could not cancel", description: e.message, variant: "destructive" }),
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/25 hover:bg-emerald-500/15">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="bg-destructive/15 text-destructive border-destructive/25 hover:bg-destructive/15">
            <XCircle className="mr-1 h-3 w-3" /> Rejected
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="secondary">
            <XCircle className="mr-1 h-3 w-3" /> Cancelled
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/25 hover:bg-amber-500/15">
            <Clock className="mr-1 h-3 w-3" /> Pending
          </Badge>
        );
    }
  };

  if (settings && !settings.enabled) {
    return (
      <StudentLayout>
        <h1 className="font-display text-2xl font-bold text-foreground">Retake Courses</h1>
        <div className="mt-6 rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          <RefreshCw className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p>Course retakes are currently disabled by administration.</p>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-foreground">Retake Courses</h1>
        <p className="text-sm text-muted-foreground">
          Request to retake courses you have previously failed. Approved retakes are added to your
          course list automatically.
        </p>
      </div>

      {/* Warning banner */}
      {failed.length > 0 && (
        <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-destructive">
              You must retake failed courses before taking new ones
            </p>
            <p className="text-sm text-muted-foreground">
              You have {failed.length} failed course{failed.length > 1 ? "s" : ""}. Submit a retake
              request below — once approved by your advisor, the course will appear in your{" "}
              <Link to="/portal/courses" className="underline">course list</Link>, timetable and
              gradebook.
            </p>
          </div>
        </div>
      )}

      {/* Failed courses list */}
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-foreground mb-3">
          Failed Courses
        </h2>
        {failedLoading ? (
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Loading…
          </div>
        ) : failed.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500/60" />
            No failed courses. You're all clear!
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Code</th>
                  <th className="px-5 py-3 text-left font-medium">Course</th>
                  <th className="px-5 py-3 text-left font-medium">Semester taken</th>
                  <th className="px-5 py-3 text-left font-medium">Previous grade</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {failed.map((c) => {
                  const usedAttempts = attemptCounts[c.courseId] || 1;
                  const max = settings?.max_attempts ?? 3;
                  const remaining = Math.max(0, max - usedAttempts);
                  const alreadyRequested = requestedCourseIds.has(c.courseId);
                  return (
                    <tr key={c.enrollmentId} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          {c.courseCode || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium text-foreground">{c.courseName}</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">
                        Y{c.year} · S{c.semester}
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-semibold text-destructive">
                          {gradeToAlbanian(c.grade)} ({gradeToLetter(c.grade)})
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          {Math.round(c.grade)}%
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="destructive" className="bg-destructive/15 text-destructive border-destructive/25 hover:bg-destructive/15">
                          Failed
                        </Badge>
                        <span className="ml-2 text-[11px] text-muted-foreground">
                          Attempt {usedAttempts}/{max}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {alreadyRequested ? (
                          <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/25 hover:bg-amber-500/15">
                            <Clock className="mr-1 h-3 w-3" /> Requested
                          </Badge>
                        ) : remaining <= 0 ? (
                          <Badge variant="secondary">Max attempts reached</Badge>
                        ) : (
                          <button
                            onClick={() => submitRetake.mutate(c)}
                            disabled={submitRetake.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-orange-600 disabled:opacity-60"
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Retake Course
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* My retake requests */}
      <section className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-lg font-semibold text-foreground">My Retake Requests</h2>
        </div>
        {rrLoading ? (
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Loading…
          </div>
        ) : retakeRequests.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            <Inbox className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            No retake requests yet.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Course</th>
                  <th className="px-5 py-3 text-left font-medium">Attempt</th>
                  <th className="px-5 py-3 text-left font-medium">Target semester</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Advisor comment</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {retakeRequests.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-5 py-3">
                      <p className="font-medium text-foreground">{r.courses?.name}</p>
                      <p className="text-xs text-muted-foreground">{r.courses?.code}</p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">#{r.attempt_number}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">
                      {r.academic_semesters?.name || "—"}
                    </td>
                    <td className="px-5 py-3">{statusBadge(r.status)}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground max-w-[260px]">
                      {r.advisor_comment || "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {r.status === "pending" && (
                        <button
                          onClick={() => cancelRetake.mutate(r.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {settings && settings.fee_amount > 0 && (
        <p className="mt-6 text-xs text-muted-foreground inline-flex items-center gap-1.5">
          <GraduationCap className="h-3.5 w-3.5" />
          A retake fee of {settings.fee_amount} {settings.fee_currency} per course may be added
          to your tuition account on approval.
        </p>
      )}
    </StudentLayout>
  );
};

export default StudentRetake;
