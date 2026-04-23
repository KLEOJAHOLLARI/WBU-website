import { Award, AlertCircle, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ScholarshipCardProps {
  percentage: number;
  required: number;
  completed: number;
}

const ScholarshipCard = ({ percentage, required, completed }: ScholarshipCardProps) => {
  const safeRequired = Math.max(1, required || 18);
  const safeCompleted = Math.max(0, completed || 0);
  const remaining = Math.max(0, safeRequired - safeCompleted);
  const progress = Math.min(100, Math.round((safeCompleted / safeRequired) * 100));
  const eligible = safeCompleted >= safeRequired;

  return (
    <div
      className={`rounded-xl border p-5 ${
        eligible
          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-900/10"
          : "border-destructive/30 bg-destructive/5"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Award className={`h-5 w-5 ${eligible ? "text-emerald-600" : "text-destructive"}`} />
        <h2 className="font-display text-base font-semibold text-foreground">
          Scholarship Status
        </h2>
        <span
          className={`ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            eligible
              ? "bg-emerald-600 text-white"
              : "bg-destructive text-destructive-foreground"
          }`}
        >
          {eligible ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          {eligible ? "Eligible" : "Below Requirement"}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-background/60 p-3">
          <p className="text-xs text-muted-foreground">Scholarship</p>
          <p className="font-display text-xl font-bold text-foreground">{percentage}%</p>
        </div>
        <div className="rounded-lg bg-background/60 p-3">
          <p className="text-xs text-muted-foreground">Required Hours</p>
          <p className="font-display text-xl font-bold text-foreground">{safeRequired}</p>
        </div>
        <div className="rounded-lg bg-background/60 p-3">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="font-display text-xl font-bold text-foreground">{safeCompleted}</p>
        </div>
        <div className="rounded-lg bg-background/60 p-3">
          <p className="text-xs text-muted-foreground">Remaining</p>
          <p className={`font-display text-xl font-bold ${eligible ? "text-emerald-600" : "text-destructive"}`}>
            {remaining}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Open lecture progress</span>
          <span className="font-semibold text-foreground">{progress}%</span>
        </div>
        <Progress
          value={progress}
          className={`h-2.5 ${eligible ? "[&>div]:bg-emerald-500" : "[&>div]:bg-destructive"}`}
        />
        {!eligible && (
          <p className="pt-1 text-xs text-destructive">
            You must attend {remaining} more open lecture hour{remaining === 1 ? "" : "s"} to keep your {percentage}% scholarship.
          </p>
        )}
      </div>
    </div>
  );
};

export default ScholarshipCard;
