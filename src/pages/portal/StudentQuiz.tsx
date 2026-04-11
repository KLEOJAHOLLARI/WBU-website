import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import StudentLayout from "@/components/StudentLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, Clock, CheckCircle2, XCircle, Loader2, Send, AlertTriangle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const StudentQuiz = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Fetch quiz
  const { data: quiz, isLoading: loadingQuiz } = useQuery({
    queryKey: ["student-quiz", quizId],
    queryFn: async () => {
      const { data, error } = await supabase.from("quizzes").select("*").eq("id", quizId!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!quizId,
  });

  // Fetch questions
  const { data: questions = [] } = useQuery({
    queryKey: ["student-quiz-questions", quizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("id, question_text, question_type, options, points, sort_order")
        .eq("quiz_id", quizId!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!quizId,
  });

  // Check for existing attempt
  const { data: existingAttempt } = useQuery({
    queryKey: ["student-quiz-attempt", quizId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("quiz_id", quizId!)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!quizId && !!user,
  });

  // Start attempt
  const startAttempt = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("quiz_attempts").insert({
        quiz_id: quizId!,
        user_id: user!.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-quiz-attempt", quizId, user?.id] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Submit attempt
  const submitAttempt = useMutation({
    mutationFn: async () => {
      if (!existingAttempt) return;
      // Fetch correct answers to compute score
      const { data: fullQuestions } = await supabase
        .from("quiz_questions")
        .select("id, correct_answer, points")
        .eq("quiz_id", quizId!);

      let score = 0;
      let maxScore = 0;
      (fullQuestions || []).forEach((q) => {
        maxScore += q.points;
        if (answers[q.id] === q.correct_answer) score += q.points;
      });

      const { error } = await supabase
        .from("quiz_attempts")
        .update({
          submitted_at: new Date().toISOString(),
          answers,
          score,
          max_score: maxScore,
        })
        .eq("id", existingAttempt.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-quiz-attempt", quizId, user?.id] });
      toast({ title: "Quiz submitted!" });
    },
    onError: (e: any) => toast({ title: "Error submitting", description: e.message, variant: "destructive" }),
  });

  // Timer
  useEffect(() => {
    if (!quiz?.time_limit_minutes || !existingAttempt || existingAttempt.submitted_at) return;
    const startedAt = new Date(existingAttempt.started_at).getTime();
    const endAt = startedAt + quiz.time_limit_minutes * 60 * 1000;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((endAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        submitAttempt.mutate();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [quiz, existingAttempt]);

  // Load saved answers
  useEffect(() => {
    if (existingAttempt?.answers && typeof existingAttempt.answers === "object") {
      setAnswers(existingAttempt.answers as Record<string, string>);
    }
  }, [existingAttempt]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const isSubmitted = !!existingAttempt?.submitted_at;
  const hasStarted = !!existingAttempt && !isSubmitted;
  const totalPoints = questions.reduce((s, q) => s + q.points, 0);

  if (loadingQuiz) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading quiz...
        </div>
      </StudentLayout>
    );
  }

  if (!quiz) {
    return (
      <StudentLayout>
        <p className="py-20 text-center text-muted-foreground">Quiz not found.</p>
      </StudentLayout>
    );
  }

  // Results view
  if (isSubmitted) {
    const pct = existingAttempt.max_score ? Math.round((Number(existingAttempt.score) / Number(existingAttempt.max_score)) * 100) : 0;
    return (
      <StudentLayout>
        <Link to={`/portal/courses/${quiz.course_id}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to course
        </Link>
        <h1 className="font-display text-2xl font-bold text-foreground">{quiz.title} — Results</h1>

        <div className="mt-6 rounded-xl border border-border bg-card p-6 text-center">
          <p className={`text-5xl font-bold ${pct >= 50 ? "text-emerald-600" : "text-destructive"}`}>{pct}%</p>
          <p className="mt-2 text-lg text-foreground">{existingAttempt.score}/{existingAttempt.max_score} points</p>
          <Progress value={pct} className={`mt-3 h-3 ${pct >= 50 ? "[&>div]:bg-emerald-500" : "[&>div]:bg-destructive"}`} />
          <Badge className="mt-3" variant={pct >= 50 ? "default" : "destructive"}>
            {pct >= 50 ? "Passed" : "Failed"}
          </Badge>
        </div>

        {/* Review answers */}
        <div className="mt-6 space-y-4">
          {questions.map((q, idx) => {
            const studentAnswer = (existingAttempt.answers as Record<string, string>)?.[q.id];
            // We don't show correct answer to prevent cheating — just show their answer
            return (
              <div key={q.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{q.question_text}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your answer: <span className="font-medium text-foreground">{studentAnswer || "No answer"}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{q.points} point{q.points !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </StudentLayout>
    );
  }

  // Not started
  if (!hasStarted) {
    return (
      <StudentLayout>
        <Link to={`/portal/courses/${quiz.course_id}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to course
        </Link>
        <h1 className="font-display text-2xl font-bold text-foreground">{quiz.title}</h1>
        {quiz.description && <p className="mt-2 text-muted-foreground">{quiz.description}</p>}

        <div className="mt-6 rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{questions.length}</p>
              <p className="text-sm text-muted-foreground">Questions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{totalPoints}</p>
              <p className="text-sm text-muted-foreground">Total Points</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{quiz.time_limit_minutes ? `${quiz.time_limit_minutes} min` : "Unlimited"}</p>
              <p className="text-sm text-muted-foreground">Time Limit</p>
            </div>
          </div>

          {quiz.time_limit_minutes && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Once you start, you have {quiz.time_limit_minutes} minutes to complete the quiz. The timer cannot be paused.
            </div>
          )}

          <button
            onClick={() => startAttempt.mutate()}
            disabled={startAttempt.isPending}
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {startAttempt.isPending ? "Starting..." : "Start Quiz"}
          </button>
        </div>
      </StudentLayout>
    );
  }

  // In-progress quiz
  const answeredCount = Object.keys(answers).length;

  return (
    <StudentLayout>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-foreground">{quiz.title}</h1>
        {timeLeft !== null && (
          <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-mono font-bold ${
            timeLeft < 60 ? "bg-destructive/10 text-destructive animate-pulse" : "bg-secondary text-foreground"
          }`}>
            <Clock className="h-4 w-4" /> {formatTime(timeLeft)}
          </div>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>{answeredCount}/{questions.length} answered</span>
        <Progress value={(answeredCount / questions.length) * 100} className="ml-3 h-2 flex-1 max-w-xs" />
      </div>

      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div key={q.id} className={`rounded-xl border bg-card p-5 transition-colors ${
            answers[q.id] ? "border-primary/30" : "border-border"
          }`}>
            <div className="flex items-start gap-3 mb-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {idx + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">{q.question_text}</p>
                <p className="text-xs text-muted-foreground">{q.points} point{q.points !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <div className="ml-10 space-y-2">
              {(q.options as string[]).map((opt: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                  className={`flex w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-sm text-left transition-all ${
                    answers[q.id] === opt
                      ? "border-primary bg-primary/10 text-foreground font-medium"
                      : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:bg-secondary/50"
                  }`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs transition-colors ${
                    answers[q.id] === opt ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                  }`}>
                    {answers[q.id] === opt && <CheckCircle2 className="h-3 w-3" />}
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => {
            if (confirm(`Submit quiz? You've answered ${answeredCount}/${questions.length} questions.`)) {
              submitAttempt.mutate();
            }
          }}
          disabled={submitAttempt.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Send className="h-4 w-4" /> {submitAttempt.isPending ? "Submitting..." : "Submit Quiz"}
        </button>
      </div>
    </StudentLayout>
  );
};

export default StudentQuiz;
