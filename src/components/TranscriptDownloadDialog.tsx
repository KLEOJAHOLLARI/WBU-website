import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Eye } from "lucide-react";
import GradeDisplayToggle from "@/components/GradeDisplayToggle";
import { gradeToAlbanian, gradeToLetter, type TranscriptRow } from "@/lib/transcript";
import type { GradeDisplayMode } from "@/lib/grading";

interface Props {
  /** Current display mode chosen via the on-page toggle. */
  mode: GradeDisplayMode;
  /** Allow the user to switch the mode for the export from inside the dialog. */
  onModeChange: (m: GradeDisplayMode) => void;
  /** Rows that will be exported — used to pick a representative sample for preview. */
  rows: TranscriptRow[];
  /** Called when the user confirms; receives the (possibly updated) mode. */
  onDownload: (mode: GradeDisplayMode) => Promise<void> | void;
  disabled?: boolean;
  buttonLabel?: string;
  buttonSize?: "sm" | "default" | "lg";
}

/** Renders a sample grade string the same way the on-screen + PDF formatter would. */
const formatSample = (pct: number, mode: GradeDisplayMode): string => {
  const alb = gradeToAlbanian(pct);
  const letter = gradeToLetter(pct);
  switch (mode) {
    case "percent":  return `${pct.toFixed(1)}%`;
    case "albanian": return `${alb}`;
    case "full":
    default:         return `${pct.toFixed(1)}% → ${alb} (${letter})`;
  }
};

const TranscriptDownloadDialog = ({
  mode, onModeChange, rows, onDownload,
  disabled, buttonLabel = "Download PDF", buttonSize = "default",
}: Props) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Pick up to 3 graded rows for the preview, fall back to fixed examples.
  const previewSamples = useMemo(() => {
    const graded = rows.filter((r) => r.grade !== null).slice(0, 3);
    if (graded.length) {
      return graded.map((r) => ({ name: r.courseName, grade: r.grade as number }));
    }
    return [
      { name: "Sample course A", grade: 92 },
      { name: "Sample course B", grade: 78 },
      { name: "Sample course C", grade: 61 },
    ];
  }, [rows]);

  const handleDownload = async () => {
    try {
      setBusy(true);
      await onDownload(mode);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled} size={buttonSize} className="gap-2">
          <Download className="h-4 w-4" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            Preview transcript export
          </DialogTitle>
          <DialogDescription>
            Choose how grades should appear in the downloaded PDF. The sample
            below updates instantly to show the exact format that will be used.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Grade display
            </p>
            <GradeDisplayToggle value={mode} onChange={onModeChange} />
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Preview ({previewSamples.length === 0 ? "—" : "real grades from this transcript"})
            </p>
            <div className="space-y-1.5">
              {previewSamples.map((s, i) => (
                <div key={i} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate text-muted-foreground">{s.name}</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatSample(s.grade, mode)}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground">
              Note: in the PDF the arrow renders as <code>-&gt;</code> instead of <code>→</code>
              (jsPDF default font limitation). On screen you keep the proper arrow.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleDownload} disabled={busy} className="gap-2">
            <Download className="h-4 w-4" />
            {busy ? "Generating…" : "Download PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TranscriptDownloadDialog;
