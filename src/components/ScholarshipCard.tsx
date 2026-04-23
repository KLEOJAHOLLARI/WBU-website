import { Award, AlertCircle, CheckCircle2, AlertTriangle, XCircle, GraduationCap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  evaluateScholarship,
  reasonLabel,
  SCHOLARSHIP_GPA_THRESHOLD,
} from "@/lib/grading";

interface ScholarshipCardProps {
  percentage: number;
  required: number;
  completed: number;
  /** Current weighted GPA on Albanian 10-scale, or null when no graded courses. */
  gpaAlbanian: number | null;
}

const ScholarshipCard = ({ percentage, required, completed, gpaAlbanian }: ScholarshipCardProps) => {
  const safeRequired = Math.max(1, required || 18);
  const safeCompleted = Math.max(0, completed || 0);
  const remaining = Math.max(0, safeRequired - safeCompleted);
  const progress = Math.min(100, Math.round((safeCompleted / safeRequired) * 100));
  const attendanceMet = safeCompleted >= safeRequired;

  const evaluation = evaluateScholarship(true, attendanceMet, gpaAlbanian);

  const statusStyles =
    evaluation.status === "active"
      ? {
          container: "border-emerald-300 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-900/10",
          icon: "text-emerald-600",
          badge: "bg-emerald-600 text-white",
          BadgeIcon: CheckCircle2,
          label: "Active",
        }
      : evaluation.status === "warning"
      ? {
          container: "border-amber-300 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/10",
          icon: "text-amber-600",
          badge: "bg-amber-500 text-white",
          BadgeIcon: AlertTriangle,
          label: "Warning",
        }
      : {
          container: "border-destructive/30 bg-destructive/5",
          icon: "text-destructive",
          badge: "bg-destructive text-destructive-foreground",
          BadgeIcon: XCircle,
          label: "Lost",
        };

  const StatusIcon = statusStyles.BadgeIcon;

  return (
    <div className={`rounded-xl border p-5 ${statusStyles.container}`}>
      <div className="flex items-center gap-2 mb-3">
        <Award className={`h-5 w-5 ${statusStyles.icon}`} />
        <h2 className="font-display text-base font-semibold text-foreground">
          Scholarship Status
        </h2>
        <span
          className={`ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyles.badge}`}
        >
          <StatusIcon className="h-3 w-3" />
          {statusStyles.label}
        </span>
      </div>

      {/* Reason chip */}
      {evaluation.status !== "active" && (
        <p className="mb-3 text-xs text-muted-foreground">
          Reason: <span className="font-medium text-foreground">{reasonLabel(evaluation.reason)}</span>
        </p>
      )}

      <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-background/60 p-3">
          <p className="text-xs text-muted-foreground">Scholarship</p>
          <p className="font-display text-xl font-bold text-foreground">{percentage}%</p>
        </div>
        <div className="rounded-lg bg-background/60 p-3">
          <p className="text-xs text-muted-foreground">Current GPA</p>
          <p className={`font-display text-xl font-bold ${
            evaluation.gpaMet ? "text-emerald-600" : evaluation.hasGradeData ? "text-destructive" : "text-muted-foreground"
          }`}>
            {gpaAlbanian != null ? gpaAlbanian.toFixed(2) : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">/ {SCHOLARSHIP_GPA_THRESHOLD.toFixed(1)} required</p>
        </div>
        <div className="rounded-lg bg-background/60 p-3">
          <p className="text-xs text-muted-foreground">Open Lecture Hrs</p>
          <p className="font-display text-xl font-bold text-foreground">
            {safeCompleted}<span className="text-sm text-muted-foreground">/{safeRequired}</span>
          </p>
        </div>
        <div className="rounded-lg bg-background/60 p-3">
          <p className="text-xs text-muted-foreground">Remaining Hrs</p>
          <p className={`font-display text-xl font-bold ${attendanceMet ? "text-emerald-600" : "text-destructive"}`}>
            {remaining}
          </p>
        </div>
      </div>

      {/* Requirement checklist */}
      <div className="mb-4 space-y-2 rounded-lg border border-border bg-background/40 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-foreground">
            <GraduationCap className="h-3.5 w-3.5" />
            GPA requirement (≥ {SCHOLARSHIP_GPA_THRESHOLD.toFixed(1)})
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            evaluation.gpaMet
              ? "bg-emerald-600 text-white"
              : evaluation.hasGradeData
              ? "bg-destructive text-destructive-foreground"
              : "bg-muted text-muted-foreground"
          }`}>
            {evaluation.gpaMet ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
            {evaluation.gpaMet ? "Met" : evaluation.hasGradeData ? "Not met" : "Pending"}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Attendance requirement
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            attendanceMet
              ? "bg-emerald-600 text-white"
              : "bg-destructive text-destructive-foreground"
          }`}>
            {attendanceMet ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
            {attendanceMet ? "Met" : "Not met"}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Open lecture progress</span>
          <span className="font-semibold text-foreground">{progress}%</span>
        </div>
        <Progress
          value={progress}
          className={`h-2.5 ${attendanceMet ? "[&>div]:bg-emerald-500" : "[&>div]:bg-destructive"}`}
        />
        {!attendanceMet && (
          <p className="pt-1 text-xs text-destructive">
            Attend {remaining} more open lecture hour{remaining === 1 ? "" : "s"} to keep your {percentage}% scholarship.
          </p>
        )}
        {attendanceMet && !evaluation.gpaMet && evaluation.hasGradeData && (
          <p className="pt-1 text-xs text-destructive">
            Your GPA must be at least {SCHOLARSHIP_GPA_THRESHOLD.toFixed(1)} to keep the scholarship.
          </p>
        )}
      </div>
    </div>
  );
};

export default ScholarshipCard;
