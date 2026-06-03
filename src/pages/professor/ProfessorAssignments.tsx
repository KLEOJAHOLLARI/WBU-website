import { useState } from "react";
import ProfessorLayout from "@/components/ProfessorLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Plus, FileText, Download, Trash2, Save, ArrowLeft, CalendarClock, Users, Award } from "lucide-react";

type Course = { id: string; code: string; name: string };
type Assignment = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  due_at: string;
  max_points: number;
  is_published: boolean;
  created_at: string;
};
type Submission = {
  id: string;
  assignment_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  submitted_at: string;
  status: string;
  score: number | null;
  feedback: string | null;
  graded_at: string | null;
  student_name?: string;
};

const ProfessorAssignments = () => {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: courses = [] } = useQuery({
    queryKey: ["prof-assign-courses", user?.id],
    queryFn: async () => {
      const q = supabase.from("courses").select("id, code, name").order("code");
      const { data, error } = isAdmin ? await q : await q.eq("professor_id", user!.id);
      if (error) throw error;
      return (data || []) as Course[];
    },
    enabled: !!user,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["prof-assignments", selectedCourse],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select("*")
        .eq("course_id", selectedCourse)
        .order("due_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Assignment[];
    },
    enabled: !!selectedCourse,
  });

  const createMut = useMutation({
    mutationFn: async (payload: { title: string; description: string; due_at: string; max_points: number }) => {
      const { error } = await supabase.from("assignments").insert({
        course_id: selectedCourse,
        created_by: user!.id,
        ...payload,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prof-assignments"] });
      toast({ title: "Assignment created" });
      setShowCreate(false);
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prof-assignments"] });
      toast({ title: "Deleted" });
    },
  });

  return (
    <ProfessorLayout>
      {!selectedAssignment ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Assignments</h1>
              <p className="text-sm text-muted-foreground">Create assignments and review student submissions</p>
            </div>
            {selectedCourse && (
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" /> New Assignment
              </button>
            )}
          </div>

          <div className="mt-5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Course</label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="mt-1 w-full max-w-md rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              <option value="">Select a course…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>

          {showCreate && <CreateForm onCancel={() => setShowCreate(false)} onSubmit={(v) => createMut.mutate(v)} loading={createMut.isPending} />}

          <div className="mt-6 space-y-3">
            {!selectedCourse ? (
              <p className="text-sm text-muted-foreground">Select a course to view its assignments.</p>
            ) : assignments.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
                No assignments yet for this course.
              </div>
            ) : (
              assignments.map((a) => (
                <AssignmentRow
                  key={a.id}
                  a={a}
                  onOpen={() => setSelectedAssignment(a)}
                  onDelete={() => deleteMut.mutate(a.id)}
                />
              ))
            )}
          </div>
        </>
      ) : (
        <ReviewSubmissions assignment={selectedAssignment} onBack={() => setSelectedAssignment(null)} />
      )}
    </ProfessorLayout>
  );
};

function CreateForm({
  onCancel,
  onSubmit,
  loading,
}: {
  onCancel: () => void;
  onSubmit: (v: { title: string; description: string; due_at: string; max_points: number }) => void;
  loading: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState("");
  const [max, setMax] = useState(100);
  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-5">
      <h3 className="font-display text-base font-semibold">New Assignment</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Due date</label>
          <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Max points</label>
          <input type="number" min={1} value={max} onChange={(e) => setMax(Number(e.target.value))} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">Cancel</button>
        <button
          disabled={loading || !title || !due}
          onClick={() => onSubmit({ title, description, due_at: new Date(due).toISOString(), max_points: max })}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create"}
        </button>
      </div>
    </div>
  );
}

function AssignmentRow({ a, onOpen, onDelete }: { a: Assignment; onOpen: () => void; onDelete: () => void }) {
  const { data: count = 0 } = useQuery({
    queryKey: ["sub-count", a.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("assignment_submissions")
        .select("*", { count: "exact", head: true })
        .eq("assignment_id", a.id);
      return count || 0;
    },
  });
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
      <div className="min-w-0 flex-1 cursor-pointer" onClick={onOpen}>
        <p className="font-medium text-foreground truncate">{a.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Due {new Date(a.due_at).toLocaleString()}</span>
          <span>Max {a.max_points} pts</span>
          <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {count} submission{count === 1 ? "" : "s"}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onOpen} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">Review</button>
        <button onClick={() => { if (confirm("Delete this assignment?")) onDelete(); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ReviewSubmissions({ assignment, onBack }: { assignment: Assignment; onBack: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["assignment-subs", assignment.id],
    queryFn: async () => {
      const { data: subs, error } = await supabase
        .from("assignment_submissions")
        .select("*")
        .eq("assignment_id", assignment.id)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      const ids = Array.from(new Set((subs || []).map((s) => s.user_id)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      const pmap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));
      return (subs || []).map((s) => ({ ...s, student_name: pmap.get(s.user_id) || "Student" })) as Submission[];
    },
  });

  const gradeMut = useMutation({
    mutationFn: async (v: { id: string; score: number; feedback: string; user_id: string }) => {
      const { error } = await supabase
        .from("assignment_submissions")
        .update({
          score: v.score,
          feedback: v.feedback,
          status: "graded",
          graded_by: user!.id,
          graded_at: new Date().toISOString(),
        })
        .eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignment-subs", assignment.id] });
      toast({ title: "Grade saved" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

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
    <>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <div className="mt-3">
        <h1 className="font-display text-2xl font-bold text-foreground">{assignment.title}</h1>
        <p className="text-sm text-muted-foreground">Due {new Date(assignment.due_at).toLocaleString()} · Max {assignment.max_points} pts</p>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : submissions.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">No submissions yet.</div>
        ) : (
          submissions.map((s) => (
            <SubmissionCard key={s.id} s={s} max={assignment.max_points} onGrade={gradeMut.mutate} onDownload={download} />
          ))
        )}
      </div>
    </>
  );
}

function SubmissionCard({
  s,
  max,
  onGrade,
  onDownload,
}: {
  s: Submission;
  max: number;
  onGrade: (v: { id: string; score: number; feedback: string; user_id: string }) => void;
  onDownload: (path: string, name: string) => void;
}) {
  const [score, setScore] = useState<string>(s.score?.toString() ?? "");
  const [feedback, setFeedback] = useState(s.feedback ?? "");

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">{s.student_name}</p>
          <p className="text-xs text-muted-foreground">Submitted {new Date(s.submitted_at).toLocaleString()}</p>
        </div>
        {s.graded_at && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Award className="h-3 w-3" /> Graded
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="truncate text-sm">{s.file_name}</span>
        </div>
        <button onClick={() => onDownload(s.file_path, s.file_name)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
          <Download className="h-3 w-3" /> Download
        </button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[140px,1fr,auto]">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Score (/{max})</label>
          <input
            type="number"
            min={0}
            max={max}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Feedback</label>
          <input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Optional feedback"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-end">
          <button
            disabled={score === ""}
            onClick={() => onGrade({ id: s.id, score: Number(score), feedback, user_id: s.user_id })}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> Save Grade
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfessorAssignments;
