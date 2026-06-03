import { useState } from "react";
import StudentLayout from "@/components/StudentLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle2, Clock, AlertCircle, Download, Award } from "lucide-react";

type Assignment = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  due_at: string;
  max_points: number;
  attachment_path: string | null;
  course_code?: string;
  course_name?: string;
};
type Submission = {
  id: string;
  assignment_id: string;
  file_name: string;
  file_path: string;
  submitted_at: string;
  status: string;
  score: number | null;
  feedback: string | null;
  graded_at: string | null;
};

const StudentAssignments = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["student-assignments", user?.id],
    queryFn: async () => {
      const { data: enrolls } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", user!.id);
      const ids = Array.from(new Set((enrolls || []).map((e) => e.course_id)));
      if (!ids.length) return [] as Assignment[];
      const [{ data: aData, error }, { data: cData }] = await Promise.all([
        supabase
          .from("assignments")
          .select("*")
          .in("course_id", ids)
          .eq("is_published", true)
          .order("due_at", { ascending: true }),
        supabase.from("courses").select("id, code, name").in("id", ids),
      ]);
      if (error) throw error;
      const cmap = new Map((cData || []).map((c) => [c.id, c]));
      return (aData || []).map((a) => ({
        ...a,
        course_code: cmap.get(a.course_id)?.code,
        course_name: cmap.get(a.course_id)?.name,
      })) as Assignment[];
    },
    enabled: !!user,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ["student-submissions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignment_submissions")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data || []) as Submission[];
    },
    enabled: !!user,
  });

  const submap = new Map(submissions.map((s) => [s.assignment_id, s]));

  const upload = async (a: Assignment, file: File) => {
    if (!user) return;
    setUploadingId(a.id);
    try {
      const existing = submap.get(a.id);
      const filePath = `${user.id}/${a.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("assignment-submissions")
        .upload(filePath, file, { upsert: false });
      if (upErr) throw upErr;

      if (existing) {
        await supabase.storage.from("assignment-submissions").remove([existing.file_path]).catch(() => {});
        const { error } = await supabase
          .from("assignment_submissions")
          .update({
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
            content_type: file.type || "application/octet-stream",
            status: "submitted",
            submitted_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("assignment_submissions").insert({
          assignment_id: a.id,
          user_id: user.id,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          content_type: file.type || "application/octet-stream",
          status: "submitted",
        });
        if (error) throw error;
      }
      toast({ title: "Submitted!", description: file.name });
      qc.invalidateQueries({ queryKey: ["student-submissions"] });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploadingId(null);
    }
  };

  const download = async (path: string, name: string) => {
    const { data, error } = await supabase.storage
      .from("assignment-submissions")
      .createSignedUrl(path, 60);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = name;
    a.click();
  };

  return (
    <StudentLayout>
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Assignments</h1>
        <p className="text-sm text-muted-foreground">Submit assignments for your enrolled courses</p>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : assignments.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            No assignments yet.
          </div>
        ) : (
          assignments.map((a) => {
            const sub = submap.get(a.id);
            const due = new Date(a.due_at);
            const overdue = due.getTime() < Date.now() && !sub;
            const graded = sub?.graded_at;
            return (
              <div key={a.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {a.course_code} · {a.course_name}
                    </p>
                    <h3 className="mt-1 font-display text-base font-semibold text-foreground">{a.title}</h3>
                    {a.description && (
                      <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{a.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                      <span className={`inline-flex items-center gap-1 ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                        <Clock className="h-3.5 w-3.5" /> Due {due.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">Max {a.max_points} pts</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {graded ? (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        <Award className="h-3.5 w-3.5" />
                        {sub?.score ?? 0} / {a.max_points}
                      </div>
                    ) : sub ? (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Submitted
                      </div>
                    ) : overdue ? (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
                        <AlertCircle className="h-3.5 w-3.5" /> Overdue
                      </div>
                    ) : null}
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                      <Upload className="h-3.5 w-3.5" />
                      {uploadingId === a.id ? "Uploading..." : sub && !graded ? "Replace file" : sub ? "Resubmit" : "Upload"}
                      <input
                        type="file"
                        className="hidden"
                        disabled={uploadingId === a.id || !!graded}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) upload(a, f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>

                {sub && (
                  <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate text-sm text-foreground">{sub.file_name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(sub.submitted_at).toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() => download(sub.file_path, sub.file_name)}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                      >
                        <Download className="h-3 w-3" /> Download
                      </button>
                    </div>
                    {sub.feedback && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Feedback:</span> {sub.feedback}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentAssignments;
