import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BookOpen, BarChart3, ClipboardCheck, FileText, ExternalLink, ArrowRight, User, CheckCircle2, XCircle, MinusCircle } from "lucide-react";

type ModalKind = "syllabus" | "grades" | "attendance";

interface Props {
  modal: { kind: ModalKind; enrollment: any } | null;
  onClose: () => void;
  onOpenFull: (courseId: string, tab: ModalKind) => void;
  attendanceData: any[];
  allSessions: any[];
  gradesData: any[];
  getProfessor: (id: string | null) => { id: string; name: string; avatar_url: string | null } | null;
}

const titleFor = (kind: ModalKind) =>
  kind === "syllabus" ? "Syllabus" : kind === "grades" ? "Grades" : "Attendance";

const iconFor = (kind: ModalKind) =>
  kind === "syllabus" ? BookOpen : kind === "grades" ? BarChart3 : ClipboardCheck;

const CourseModal = ({ modal, onClose, onOpenFull, attendanceData, allSessions, gradesData, getProfessor }: Props) => {
  const enr = modal?.enrollment;
  const course = enr?.courses;
  const kind = modal?.kind;
  const Icon = kind ? iconFor(kind) : BookOpen;
  const professor = getProfessor(course?.professor_id ?? null);

  // Attendance computation
  const attInfo = useMemo(() => {
    if (!enr || !course) return null;
    const sessions = allSessions.filter((s) => s.course_id === course.id);
    if (sessions.length === 0) return { pct: null as number | null, total: 0, present: 0, absent: 0, excused: 0 };
    const records = attendanceData.filter((r) => r.enrollment_id === enr.id);
    const present = records.filter((r) => r.status === "present").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const excused = records.filter((r) => r.status === "excused").length;
    const pct = Math.round((present / sessions.length) * 100);
    return { pct, total: sessions.length, present, absent, excused };
  }, [enr, course, allSessions, attendanceData]);

  // Grades computation
  const gradeRows = useMemo(() => {
    if (!enr) return [];
    return gradesData
      .filter((g) => g.enrollment_id === enr.id)
      .map((g) => ({
        id: g.id,
        component: g.grade_components?.name || "Component",
        weight: g.grade_components?.weight || 0,
        score: g.score,
        max: g.max_score || 100,
        instance: g.instance_number,
      }));
  }, [enr, gradesData]);

  const weighted = useMemo(() => {
    let sumW = 0;
    let total = 0;
    gradeRows.forEach((g) => {
      if (g.score == null) return;
      const pct = (Number(g.score) / Number(g.max)) * 100;
      total += pct * Number(g.weight);
      sumW += Number(g.weight);
    });
    return sumW > 0 ? total / sumW : null;
  }, [gradeRows]);

  return (
    <Dialog open={!!modal} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        {modal && course && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="truncate text-left font-display">
                    {titleFor(modal.kind)} — {course.name}
                  </DialogTitle>
                  <DialogDescription className="text-left">
                    {course.code}
                    {course.semester ? ` · Semester ${course.semester}` : ""}
                    {professor ? ` · ${professor.name}` : ""}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="mt-2 max-h-[60vh] overflow-auto">
              {modal.kind === "syllabus" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Code</p>
                      <p className="font-display text-sm font-semibold text-foreground">{course.code || "—"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">ECTS</p>
                      <p className="font-display text-sm font-semibold text-foreground">{course.ects ?? "—"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Hours / week</p>
                      <p className="font-display text-sm font-semibold text-foreground">{course.hours_per_week ?? "—"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Year · Semester</p>
                      <p className="font-display text-sm font-semibold text-foreground">{course.year} · {course.semester}</p>
                    </div>
                  </div>

                  {professor && (
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Professor:</span>
                      <span className="font-medium text-foreground">{professor.name}</span>
                    </div>
                  )}

                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <h4 className="font-display text-sm font-semibold text-foreground">Syllabus document</h4>
                    </div>
                    {course.syllabus_url ? (
                      <a
                        href={course.syllabus_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                      >
                        Open syllabus PDF
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">No syllabus uploaded yet.</p>
                    )}
                  </div>
                </div>
              )}

              {modal.kind === "grades" && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Weighted average</p>
                    <p className="font-display text-2xl font-bold text-foreground">
                      {weighted != null ? `${weighted.toFixed(1)}%` : "—"}
                    </p>
                  </div>

                  {gradeRows.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      No grades recorded yet.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Component</th>
                            <th className="px-3 py-2 text-left font-medium">Weight</th>
                            <th className="px-3 py-2 text-left font-medium">Score</th>
                            <th className="px-3 py-2 text-left font-medium">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gradeRows.map((g) => {
                            const pct = g.score != null ? (Number(g.score) / Number(g.max)) * 100 : null;
                            return (
                              <tr key={g.id} className="border-t border-border">
                                <td className="px-3 py-2 text-foreground">
                                  {g.component}
                                  {g.instance > 1 ? ` #${g.instance}` : ""}
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">{Number(g.weight)}%</td>
                                <td className="px-3 py-2 text-foreground">
                                  {g.score != null ? `${g.score} / ${g.max}` : "—"}
                                </td>
                                <td className="px-3 py-2">
                                  {pct != null ? (
                                    <Badge
                                      className={
                                        pct >= 50
                                          ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/25 hover:bg-emerald-500/15"
                                          : "bg-destructive/15 text-destructive border-destructive/25 hover:bg-destructive/15"
                                      }
                                    >
                                      {pct.toFixed(0)}%
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
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

              {modal.kind === "attendance" && attInfo && (
                <div className="space-y-4">
                  {attInfo.total === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      No attendance sessions recorded yet.
                    </div>
                  ) : (
                    <>
                      <div className="rounded-lg border border-border bg-card p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-muted-foreground">Attendance</p>
                          <span
                            className={`text-2xl font-display font-bold ${
                              (attInfo.pct ?? 0) < 75 ? "text-destructive" : "text-emerald-600"
                            }`}
                          >
                            {attInfo.pct}%
                          </span>
                        </div>
                        <Progress
                          value={attInfo.pct ?? 0}
                          className={`h-2 ${(attInfo.pct ?? 0) < 75 ? "[&>div]:bg-destructive" : "[&>div]:bg-emerald-500"}`}
                        />
                        {(attInfo.pct ?? 0) < 75 && (
                          <p className="mt-2 text-xs font-medium text-destructive">
                            ⚠ Below 75% — final exam blocked
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-lg border border-border bg-card p-3 text-center">
                          <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-600" />
                          <p className="mt-1 font-display text-xl font-bold text-foreground">{attInfo.present}</p>
                          <p className="text-xs text-muted-foreground">Present</p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-3 text-center">
                          <XCircle className="mx-auto h-4 w-4 text-destructive" />
                          <p className="mt-1 font-display text-xl font-bold text-foreground">{attInfo.absent}</p>
                          <p className="text-xs text-muted-foreground">Absent</p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-3 text-center">
                          <MinusCircle className="mx-auto h-4 w-4 text-muted-foreground" />
                          <p className="mt-1 font-display text-xl font-bold text-foreground">{attInfo.excused}</p>
                          <p className="text-xs text-muted-foreground">Excused</p>
                        </div>
                      </div>

                      <p className="text-center text-xs text-muted-foreground">
                        Total sessions: {attInfo.total}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button onClick={() => onOpenFull(course.id, modal.kind)}>
                Open full course
                <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CourseModal;
