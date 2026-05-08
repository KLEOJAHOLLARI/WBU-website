import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import StudentLayout from "@/components/StudentLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Star, ShieldCheck, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const StudentFeedback = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: semester } = useQuery({
    queryKey: ["active-feedback-semester"],
    queryFn: async () => {
      const { data } = await supabase
        .from("academic_semesters")
        .select("id, name, semester, feedback_enabled")
        .eq("is_current", true)
        .maybeSingle();
      return data;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["student-feedback-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("program")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["my-feedback-courses", user?.id, semester?.id, profile?.program],
    enabled: !!user && !!semester?.id && !!profile?.program,
    queryFn: async () => {
      // All courses for this program in the current semester number
      const { data: progCourses } = await supabase
        .from("courses")
        .select("id, name, code, professor_id, semester")
        .eq("program", profile!.program!)
        .eq("semester", semester!.semester);

      // Shared courses for this program
      const { data: shared } = await supabase
        .from("course_shared_programs")
        .select("course_id, courses(id, name, code, professor_id, semester)")
        .eq("program_slug", profile!.program!);
      const sharedCourses = (shared || [])
        .map((s: any) => s.courses)
        .filter((c: any) => c && c.semester === semester!.semester);

      const all = [...(progCourses || []), ...sharedCourses].filter((c: any) => c && c.professor_id);

      const seen = new Set<string>();
      const unique = all.filter((c: any) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });

      const withStatus = await Promise.all(
        unique.map(async (c: any) => {
          const { data: submitted } = await supabase.rpc("has_submitted_feedback", {
            _course_id: c.id,
            _semester_id: semester!.id,
          });
          const { data: prof } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", c.professor_id)
            .maybeSingle();
          return { ...c, submitted, professor_name: prof?.full_name || "Professor" };
        })
      );
      return withStatus;
    },
  });

  const isOpen = (semester as any)?.feedback_enabled === true;

  return (
    <StudentLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Professor Feedback</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Your feedback is fully anonymous. Professors and admins only see aggregated ratings and comments.
          </p>
        </div>

        {!semester ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No active semester.</CardContent></Card>
        ) : !isOpen ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            The feedback window for {semester.name} is currently closed.
          </CardContent></Card>
        ) : isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : courses.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No courses available to review this semester.</CardContent></Card>
        ) : (
          <div className="space-y-4">
            {courses.map((c: any) => (
              <FeedbackCard
                key={c.id}
                course={c}
                semesterId={semester.id}
                onSubmitted={() => qc.invalidateQueries({ queryKey: ["my-feedback-courses"] })}
              />
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

const FeedbackCard = ({
  course, semesterId, onSubmitted,
}: { course: any; semesterId: string; onSubmitted: () => void }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (rating < 1) {
      toast({ title: "Pick a rating", description: "Please select 1–5 stars.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("submit_professor_feedback", {
      _course_id: course.id,
      _semester_id: semesterId,
      _rating: rating,
      _comment: comment || null,
    });
    setSubmitting(false);
    if (error || !(data as any)?.ok) {
      toast({ title: "Could not submit", description: (data as any)?.reason || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Thank you", description: "Your anonymous feedback has been recorded." });
    onSubmitted();
  };

  if (course.submitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>{course.code} · {course.name}</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 text-sm font-normal">
              <CheckCircle2 className="h-4 w-4" /> Submitted
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          You've already submitted feedback for {course.professor_name}.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{course.code} · {course.name}</CardTitle>
        <p className="text-sm text-muted-foreground">Professor: {course.professor_name}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onClick={() => setRating(n)}
              className="p-1"
            >
              <Star
                className={`h-7 w-7 transition-colors ${
                  n <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
                }`}
              />
            </button>
          ))}
        </div>
        <Textarea
          placeholder="Optional comment (anonymous)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={1000}
        />
        <Button onClick={submit} disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Submit Anonymously
        </Button>
      </CardContent>
    </Card>
  );
};

export default StudentFeedback;
