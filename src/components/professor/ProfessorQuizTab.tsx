import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Save, Eye, EyeOff, Clock, HelpCircle, CheckCircle2,
  GripVertical, Loader2, Users, BarChart3
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const inputBase =
  "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors";

interface Props {
  courseId: string;
}

const ProfessorQuizTab = ({ courseId }: Props) => {
  const qc = useQueryClient();
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newQuiz, setNewQuiz] = useState({ title: "", description: "", time_limit_minutes: "" });

  // Fetch quizzes
  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ["quizzes", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch questions for selected quiz
  const { data: questions = [] } = useQuery({
    queryKey: ["quiz-questions", selectedQuiz],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", selectedQuiz!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedQuiz,
  });

  // Fetch attempts for selected quiz
  const { data: attempts = [] } = useQuery({
    queryKey: ["quiz-attempts", selectedQuiz],
    queryFn: async () => {
      if (!selectedQuiz) return [];
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("quiz_id", selectedQuiz)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Fetch student profiles
      const userIds = [...new Set((data || []).map(a => a.user_id))];
      if (!userIds.length) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      return (data || []).map(a => ({ ...a, profile: profileMap.get(a.user_id) }));
    },
    enabled: !!selectedQuiz,
  });

  // Create quiz
  const createQuiz = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("quizzes").insert({
        course_id: courseId,
        title: newQuiz.title,
        description: newQuiz.description,
        time_limit_minutes: newQuiz.time_limit_minutes ? parseInt(newQuiz.time_limit_minutes) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quizzes", courseId] });
      setNewQuiz({ title: "", description: "", time_limit_minutes: "" });
      setShowCreate(false);
      toast({ title: "Quiz created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Toggle publish
  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.from("quizzes").update({ is_published: published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quizzes", courseId] });
      toast({ title: "Quiz updated" });
    },
  });

  // Delete quiz
  const deleteQuiz = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quizzes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quizzes", courseId] });
      if (selectedQuiz) setSelectedQuiz(null);
      toast({ title: "Quiz deleted" });
    },
  });

  // Add question
  const [newQuestion, setNewQuestion] = useState({
    question_text: "",
    options: ["", "", "", ""],
    correct_answer: "",
    points: 1,
  });

  const addQuestion = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("quiz_questions").insert({
        quiz_id: selectedQuiz!,
        question_text: newQuestion.question_text,
        options: newQuestion.options.filter(o => o.trim()),
        correct_answer: newQuestion.correct_answer,
        points: newQuestion.points,
        sort_order: questions.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quiz-questions", selectedQuiz] });
      setNewQuestion({ question_text: "", options: ["", "", "", ""], correct_answer: "", points: 1 });
      toast({ title: "Question added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteQuestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quiz_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quiz-questions", selectedQuiz] });
      toast({ title: "Question removed" });
    },
  });

  const [viewMode, setViewMode] = useState<"questions" | "results">("questions");

  const selectedQuizData = quizzes.find(q => q.id === selectedQuiz);

  if (isLoading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading quizzes...</div>;

  // Quiz list view
  if (!selectedQuiz) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Quizzes & Exams</h2>
            <p className="text-sm text-muted-foreground">{quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""}</p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> New Quiz
          </button>
        </div>

        {showCreate && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <input
              value={newQuiz.title}
              onChange={(e) => setNewQuiz({ ...newQuiz, title: e.target.value })}
              placeholder="Quiz title"
              className={`${inputBase} w-full`}
            />
            <textarea
              value={newQuiz.description}
              onChange={(e) => setNewQuiz({ ...newQuiz, description: e.target.value })}
              placeholder="Description (optional)"
              className={`${inputBase} w-full`}
              rows={2}
            />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <input
                  type="number"
                  value={newQuiz.time_limit_minutes}
                  onChange={(e) => setNewQuiz({ ...newQuiz, time_limit_minutes: e.target.value })}
                  placeholder="Time limit (min)"
                  className={`${inputBase} w-40`}
                  min={1}
                />
              </div>
              <button
                onClick={() => createQuiz.mutate()}
                disabled={!newQuiz.title.trim() || createQuiz.isPending}
                className="ml-auto inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Save className="h-4 w-4" /> Create
              </button>
            </div>
          </div>
        )}

        {quizzes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
            <HelpCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-muted-foreground">No quizzes created yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 cursor-pointer"
                onClick={() => { setSelectedQuiz(quiz.id); setViewMode("questions"); }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-semibold text-foreground">{quiz.title}</h3>
                    {quiz.description && <p className="mt-1 text-sm text-muted-foreground">{quiz.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {quiz.time_limit_minutes && (
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="mr-1 h-3 w-3" /> {quiz.time_limit_minutes} min
                        </Badge>
                      )}
                      <Badge variant={quiz.is_published ? "default" : "secondary"} className="text-xs">
                        {quiz.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => togglePublish.mutate({ id: quiz.id, published: !quiz.is_published })}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                      title={quiz.is_published ? "Unpublish" : "Publish"}
                    >
                      {quiz.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => { if (confirm("Delete this quiz?")) deleteQuiz.mutate(quiz.id); }}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Quiz detail view (questions + results)
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSelectedQuiz(null)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to quizzes
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">{selectedQuizData?.title}</h2>
          <p className="text-sm text-muted-foreground">{questions.length} questions · {attempts.length} attempts</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode("questions")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === "questions" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <HelpCircle className="h-4 w-4" /> Questions
          </button>
          <button
            onClick={() => setViewMode("results")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === "results" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <BarChart3 className="h-4 w-4" /> Results ({attempts.length})
          </button>
        </div>
      </div>

      {viewMode === "questions" ? (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div key={q.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{q.question_text}</p>
                    <div className="mt-2 space-y-1">
                      {(q.options as string[]).map((opt: string, i: number) => (
                        <div key={i} className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${
                          opt === q.correct_answer ? "bg-emerald-500/10 text-emerald-700 font-medium" : "text-muted-foreground"
                        }`}>
                          {opt === q.correct_answer ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5 rounded-full border border-current inline-block" />}
                          {opt}
                        </div>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{q.points} point{q.points !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <button
                  onClick={() => { if (confirm("Delete question?")) deleteQuestion.mutate(q.id); }}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-dashed border-border bg-card/50 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Add Question</h3>
            <textarea
              value={newQuestion.question_text}
              onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
              placeholder="Question text..."
              className={`${inputBase} w-full`}
              rows={2}
            />
            <div className="space-y-2">
              {newQuestion.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={newQuestion.correct_answer === opt && opt !== ""}
                    onChange={() => setNewQuestion({ ...newQuestion, correct_answer: opt })}
                    className="accent-primary"
                    disabled={!opt.trim()}
                  />
                  <input
                    value={opt}
                    onChange={(e) => {
                      const opts = [...newQuestion.options];
                      opts[i] = e.target.value;
                      setNewQuestion({ ...newQuestion, options: opts });
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    className={`${inputBase} flex-1`}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Points:</label>
                <input
                  type="number"
                  value={newQuestion.points}
                  onChange={(e) => setNewQuestion({ ...newQuestion, points: parseInt(e.target.value) || 1 })}
                  className={`${inputBase} w-20`}
                  min={1}
                />
              </div>
              <button
                onClick={() => addQuestion.mutate()}
                disabled={!newQuestion.question_text.trim() || !newQuestion.correct_answer || addQuestion.isPending}
                className="ml-auto inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Plus className="h-4 w-4" /> Add Question
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {attempts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
              <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-muted-foreground">No students have attempted this quiz yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/80">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Student</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Percentage</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a: any) => {
                    const pct = a.max_score > 0 ? Math.round((Number(a.score) / Number(a.max_score)) * 100) : 0;
                    return (
                      <tr key={a.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 text-foreground font-medium">{a.profile?.full_name || a.profile?.email || "Unknown"}</td>
                        <td className="px-4 py-3 text-center font-bold text-foreground">
                          {a.submitted_at ? `${a.score}/${a.max_score}` : <Badge variant="secondary">In progress</Badge>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {a.submitted_at ? (
                            <span className={`font-bold ${pct >= 50 ? "text-emerald-600" : "text-destructive"}`}>{pct}%</span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground text-xs">
                          {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "Not submitted"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfessorQuizTab;
