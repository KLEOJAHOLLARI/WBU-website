import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import StudentLayout from "@/components/StudentLayout";
import ProfessorLayout from "@/components/ProfessorLayout";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, CalendarDays, Clock, MapPin, User, BookOpen,
  GraduationCap, FileText, AlertCircle, Pencil,
} from "lucide-react";

type ExamRow = {
  id: string;
  program: string;
  course_id: string | null;
  exam_date: string;
  start_time: string;
  end_time: string;
  room: string;
  exam_type: string;
  notes: string | null;
  is_published: boolean;
  supervisor_name: string;
  courses?: {
    id: string; name: string; code: string;
    year: number; semester: number; program: string;
  } | null;
};

const typeColors: Record<string, string> = {
  final: "bg-primary/10 text-primary border-primary/20",
  midterm: "bg-amber-100 text-amber-700 border-amber-200",
  retake: "bg-red-100 text-red-700 border-red-200",
  quiz: "bg-blue-100 text-blue-700 border-blue-200",
};

const ExamDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isProfessor } = useAuth();

  const { data: exam, isLoading, error } = useQuery({
    queryKey: ["exam-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_schedule")
        .select("*, courses(id, name, code, year, semester, program)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ExamRow | null;
    },
  });

  const { data: programInfo } = useQuery({
    queryKey: ["exam-program", exam?.program],
    enabled: !!exam?.program,
    queryFn: async () => {
      const { data } = await supabase
        .from("programs")
        .select("title, faculty")
        .eq("slug", exam!.program)
        .maybeSingle();
      return data;
    },
  });

  const backHref = isAdmin ? "/admin/exams" : isProfessor ? "/professor/exams" : "/portal/exams";
  const Layout = isAdmin ? AdminLayout : isProfessor ? ProfessorLayout : StudentLayout;

  const content = (() => {
    if (isLoading) {
      return <div className="py-16 text-center text-muted-foreground">Loading exam…</div>;
    }
    if (error || !exam) {
      return (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/60" />
          <h2 className="text-lg font-semibold text-foreground">Exam not found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This exam may have been removed or isn't available to you.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to={backHref}><ArrowLeft className="h-4 w-4 mr-2" />Back to schedule</Link>
          </Button>
        </div>
      );
    }

    const dateStr = new Date(exam.exam_date).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const isPast = exam.exam_date < new Date().toISOString().slice(0, 10);

    return (
      <>
        <div className="flex items-center justify-between gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(backHref)}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back to schedule
          </Button>
          <div className="flex items-center gap-2">
            <Badge className={typeColors[exam.exam_type] || "bg-muted"}>{exam.exam_type}</Badge>
            {!exam.is_published && <Badge variant="secondary">Draft</Badge>}
            {isPast && <Badge variant="outline">Past</Badge>}
            {isAdmin && (
              <Button asChild size="sm" className="ml-2">
                <Link to={`/admin/exams?edit=${exam.id}`}>
                  <Pencil className="h-4 w-4 mr-2" />Edit exam
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Hero */}
        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-card p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="hidden md:flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <CalendarDays className="h-7 w-7 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground capitalize">{exam.exam_type} exam</p>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mt-1">
                {exam.courses?.name || "Program-wide exam"}
              </h1>
              {exam.courses?.code && (
                <p className="text-sm text-muted-foreground mt-1">Course code: {exam.courses.code}</p>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoTile icon={CalendarDays} label="Date" value={dateStr} />
            <InfoTile icon={Clock} label="Time" value={`${exam.start_time} – ${exam.end_time}`} />
            <InfoTile icon={MapPin} label="Room / Location" value={exam.room || "TBD"} />
            <InfoTile icon={User} label="Supervisor" value={exam.supervisor_name || "—"} />
          </div>
        </div>

        {/* Details grid */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Section title="Notes & Instructions" icon={FileText}>
              {exam.notes ? (
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{exam.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No additional instructions provided.</p>
              )}
            </Section>

            {exam.courses && (
              <Section title="Course Information" icon={BookOpen}>
                <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                  <Field label="Course name" value={exam.courses.name} />
                  <Field label="Course code" value={exam.courses.code || "—"} />
                  <Field label="Year" value={`Year ${exam.courses.year}`} />
                  <Field label="Semester" value={`Semester ${exam.courses.semester}`} />
                </dl>
              </Section>
            )}
          </div>

          <div className="space-y-6">
            <Section title="Program" icon={GraduationCap}>
              <dl className="space-y-3 text-sm">
                <Field label="Program" value={programInfo?.title || exam.program} />
                {programInfo?.faculty && <Field label="Faculty" value={programInfo.faculty} />}
                {exam.courses && (
                  <Field
                    label="Applies to"
                    value={`Year ${exam.courses.year}, Semester ${exam.courses.semester}`}
                  />
                )}
              </dl>
            </Section>

            <Section title="Status" icon={AlertCircle}>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Published</span>
                  <Badge variant={exam.is_published ? "default" : "secondary"}>
                    {exam.is_published ? "Yes" : "Draft"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">When</span>
                  <Badge variant="outline">{isPast ? "Past" : "Upcoming"}</Badge>
                </div>
              </div>
            </Section>
          </div>
        </div>
      </>
    );
  })();

  return <Layout>{content}</Layout>;
};

const InfoTile = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="rounded-xl border border-border bg-card/60 p-4">
    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
    <p className="mt-1.5 text-sm font-semibold text-foreground">{value}</p>
  </div>
);

const Section = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-card p-5">
    <h2 className="flex items-center gap-2 font-semibold text-foreground mb-3">
      <Icon className="h-4 w-4 text-primary" />
      {title}
    </h2>
    {children}
  </div>
);

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="text-sm font-medium text-foreground">{value}</dd>
  </div>
);

export default ExamDetail;
