import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { jsPDF } from "jspdf";
import { Printer, Download, X, Loader2, CheckCircle2, FileText, CalendarDays, AlertTriangle } from "lucide-react";
import { useActiveSemester } from "@/hooks/useActiveSemester";
import { toast } from "@/hooks/use-toast";

interface Course {
  id: string;
  name: string;
  code?: string | null;
  program?: string | null;
  hours_per_week?: number | null;
  professor_id?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  course: Course | null;
  professorName: string;
  totalWeeks?: number;
}

const inputBase =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors";

// Format a date as DD MMM YYYY
const fmt = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const weeklyMonday = (weekOneMonday: Date, weekIndex: number) => {
  const d = new Date(weekOneMonday);
  d.setDate(weekOneMonday.getDate() + weekIndex * 7);
  return d;
};

const AttendanceSheetDialog = ({ open, onClose, course, professorName, totalWeeks = 15 }: Props) => {
  const { data: semester } = useActiveSemester();

  // ---- Semester week math (auto-detect current week) ----
  const semesterWeeks = useMemo(() => {
    if (!semester?.start_date) return null;
    const start = new Date(semester.start_date);
    const day = start.getDay(); // 0=Sun
    const offsetToMonday = day === 0 ? -6 : 1 - day;
    const weekOneMonday = new Date(start);
    weekOneMonday.setDate(start.getDate() + offsetToMonday);
    weekOneMonday.setHours(0, 0, 0, 0);

    const end = semester.end_date ? new Date(semester.end_date) : null;
    let computedTotal = totalWeeks;
    if (end) {
      const diffDays = Math.ceil((end.getTime() - weekOneMonday.getTime()) / (1000 * 60 * 60 * 24));
      const weeks = Math.max(1, Math.ceil(diffDays / 7));
      computedTotal = Math.max(1, Math.min(30, weeks));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = today.getTime() - weekOneMonday.getTime();
    let currentWeek = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
    if (currentWeek < 1) currentWeek = 1;
    if (currentWeek > computedTotal) currentWeek = computedTotal;

    const weeks = Array.from({ length: computedTotal }).map((_, i) => {
      const ws = new Date(weeklyMonday(weekOneMonday, i));
      const we = new Date(ws);
      we.setDate(ws.getDate() + 6);
      const n = i + 1;
      return {
        number: n,
        start: ws,
        end: we,
        isCurrent: n === currentWeek,
        isFuture: n > currentWeek,
        isPast: n < currentWeek,
      };
    });

    return { weekOneMonday, totalWeeks: computedTotal, currentWeek, weeks };
  }, [semester, totalWeeks]);

  const [week, setWeek] = useState<number>(1);
  const [sessionType, setSessionType] = useState<"Lecture" | "Lab" | "Seminar">("Lecture");
  const [group, setGroup] = useState<string>("");
  const [section, setSection] = useState<string>("");
  const [room, setRoom] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [dateOverride, setDateOverride] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  // Enrolled students
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["attendance-sheet-enrollments", course?.id],
    queryFn: async () => {
      if (!course?.id) return [];
      const { data: enr, error } = await supabase
        .from("enrollments")
        .select("id, user_id")
        .eq("course_id", course.id);
      if (error) throw error;
      if (!enr?.length) return [];
      const userIds = [...new Set(enr.map((e) => e.user_id))];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, student_id, email")
        .in("user_id", userIds);
      const map = new Map((profs || []).map((p) => [p.user_id, p]));
      return enr
        .map((e) => ({
          enrollment_id: e.id,
          ...(map.get(e.user_id) || { full_name: "Unknown", student_id: "", email: "" }),
        }))
        .sort((a: any, b: any) => (a.full_name || "").localeCompare(b.full_name || ""));
    },
    enabled: !!course?.id && open,
  });

  // All attendance sessions for this course (for per-week status)
  const { data: allSessions = [] } = useQuery({
    queryKey: ["attendance-sheet-all-sessions", course?.id],
    queryFn: async () => {
      if (!course?.id) return [];
      const { data, error } = await supabase
        .from("attendance_sessions")
        .select("id, session_date, week_number")
        .eq("course_id", course.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!course?.id && open,
  });

  const existingSessions = useMemo(
    () => allSessions.filter((s) => s.week_number === week),
    [allSessions, week]
  );

  // Map: week_number -> session ids
  const sessionsByWeek = useMemo(() => {
    const m = new Map<number, string[]>();
    allSessions.forEach((s) => {
      const arr = m.get(s.week_number) || [];
      arr.push(s.id);
      m.set(s.week_number, arr);
    });
    return m;
  }, [allSessions]);

  const sessionIdsKey = useMemo(
    () => existingSessions.map((s) => s.id).sort().join(","),
    [existingSessions]
  );

  // All records across the course's sessions (to know which weeks have records)
  const allSessionIdsKey = useMemo(
    () => allSessions.map((s) => s.id).sort().join(","),
    [allSessions]
  );

  const { data: allRecords = [] } = useQuery({
    queryKey: ["attendance-sheet-all-records", course?.id, allSessionIdsKey],
    queryFn: async () => {
      const ids = allSessionIdsKey ? allSessionIdsKey.split(",") : [];
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from("attendance_records")
        .select("session_id")
        .in("session_id", ids);
      if (error) throw error;
      return data || [];
    },
    enabled: !!allSessionIdsKey,
  });

  // Set of week numbers that have at least one record
  const recordedWeeks = useMemo(() => {
    const sessionToWeek = new Map<string, number>();
    allSessions.forEach((s) => sessionToWeek.set(s.id, s.week_number));
    const set = new Set<number>();
    allRecords.forEach((r) => {
      const w = sessionToWeek.get(r.session_id);
      if (w != null) set.add(w);
    });
    return set;
  }, [allSessions, allRecords]);

  const { data: existingRecords = [] } = useQuery({
    queryKey: ["attendance-sheet-records", course?.id, week, sessionIdsKey],
    queryFn: async () => {
      const ids = sessionIdsKey ? sessionIdsKey.split(",") : [];
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from("attendance_records")
        .select("enrollment_id, status, session_id")
        .in("session_id", ids);
      if (error) throw error;
      return data || [];
    },
    enabled: !!sessionIdsKey,
  });

  // Date range for currently selected week (from precomputed semesterWeeks)
  const weekRange = useMemo(() => {
    const w = semesterWeeks?.weeks.find((x) => x.number === week);
    return w ? { start: w.start, end: w.end } : null;
  }, [semesterWeeks, week]);

  useEffect(() => {
    if (open) {
      setWeek(semesterWeeks?.currentWeek ?? 1);
      setSessionType("Lecture");
      setGroup("");
      setSection("");
      setRoom("");
      setTime("");
      setDateOverride("");
    }
  }, [open, semesterWeeks?.currentWeek]);

  const hasExisting = existingSessions.length > 0;

  const buildPdf = (): jsPDF => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = 210;
    const pageH = 297;
    const margin = 15;

    // Header bar
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Western Balkans University", margin, 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Tirana, Albania · wbu.edu.al", margin, 16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("ATTENDANCE SHEET", pageW - margin, 13, { align: "right" });

    // Reset text
    doc.setTextColor(15, 23, 42);

    // Course info block
    let y = 30;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`${course?.name || ""}${course?.code ? ` (${course.code})` : ""}`, margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const dateLabel = dateOverride
      ? fmt(new Date(dateOverride))
      : weekRange
      ? `${fmt(weekRange.start)} – ${fmt(weekRange.end)}`
      : "—";

    const leftCol = [
      `Professor: ${professorName || "—"}`,
      `Program: ${course?.program || "—"}`,
      `Session: ${sessionType}${group ? ` · Group ${group}` : ""}${section ? ` · Section ${section}` : ""}`,
    ];
    const rightCol = [
      `Semester: ${semester?.name || "—"}  (Year ${semester?.year ?? "—"} · Sem ${semester?.semester ?? "—"})`,
      `Week: ${week}   Date: ${dateLabel}`,
      `Room: ${room || "—"}    Time: ${time || "—"}`,
    ];

    leftCol.forEach((t, i) => doc.text(t, margin, y + i * 5));
    rightCol.forEach((t, i) => doc.text(t, pageW / 2, y + i * 5));
    y += leftCol.length * 5 + 4;

    // Existing-attendance badge
    if (hasExisting) {
      doc.setFillColor(220, 252, 231);
      doc.setDrawColor(34, 197, 94);
      doc.roundedRect(margin, y, 80, 6, 1, 1, "FD");
      doc.setTextColor(22, 101, 52);
      doc.setFontSize(8);
      doc.text("✓ Existing attendance recorded for this week", margin + 2, y + 4);
      doc.setTextColor(15, 23, 42);
      y += 9;
    } else {
      y += 2;
    }

    // Table header
    const cols = [
      { title: "No.", w: 12 },
      { title: "Student ID", w: 28 },
      { title: "Full Name", w: 60 },
      { title: "Signature", w: 45 },
      { title: "P/A", w: 14 },
      { title: "Notes", w: 21 },
    ];
    const tableW = cols.reduce((s, c) => s + c.w, 0);
    const rowH = 9;

    const drawHeader = (yy: number) => {
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, yy, tableW, 7, "F");
      doc.setDrawColor(100);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      let x = margin;
      cols.forEach((c) => {
        doc.rect(x, yy, c.w, 7);
        doc.text(c.title, x + 2, yy + 5);
        x += c.w;
      });
      doc.setFont("helvetica", "normal");
      return yy + 7;
    };

    y = drawHeader(y);

    // Pre-mark map (digital scans / existing records)
    const statusByEnrollment = new Map<string, string>();
    existingRecords.forEach((r) => statusByEnrollment.set(r.enrollment_id, r.status));

    doc.setFontSize(9);
    students.forEach((s: any, idx: number) => {
      // Page break
      if (y + rowH > pageH - 20) {
        // footer
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(`Page continues...`, pageW - margin, pageH - 8, { align: "right" });
        doc.addPage();
        doc.setTextColor(15, 23, 42);
        y = margin;
        y = drawHeader(y);
        doc.setFontSize(9);
      }
      let x = margin;
      // alternating row
      if (idx % 2 === 1) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, y, tableW, rowH, "F");
      }
      const rowVals = [
        String(idx + 1),
        s.student_id || "—",
        s.full_name || "Unknown",
        "",
        "",
        "",
      ];
      cols.forEach((c, ci) => {
        doc.setDrawColor(180);
        doc.rect(x, y, c.w, rowH);
        const val = rowVals[ci];
        if (val) {
          const lines = doc.splitTextToSize(val, c.w - 3);
          doc.text(lines, x + 2, y + 5.5);
        }
        // P/A pre-mark
        if (ci === 4) {
          const st = statusByEnrollment.get(s.enrollment_id);
          if (st === "present" || st === "excused") {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(22, 101, 52);
            doc.text("P", x + c.w / 2, y + 5.5, { align: "center" });
            doc.setTextColor(15, 23, 42);
            doc.setFont("helvetica", "normal");
          } else if (st === "absent") {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(153, 27, 27);
            doc.text("A", x + c.w / 2, y + 5.5, { align: "center" });
            doc.setTextColor(15, 23, 42);
            doc.setFont("helvetica", "normal");
          }
        }
        x += c.w;
      });
      y += rowH;
    });

    if (students.length === 0) {
      doc.setTextColor(120);
      doc.text("No enrolled students.", margin + 2, y + 6);
      doc.setTextColor(15, 23, 42);
      y += 10;
    }

    // Signature footer
    y = Math.max(y + 10, pageH - 40);
    doc.setDrawColor(80);
    doc.line(margin, y, margin + 70, y);
    doc.line(pageW - margin - 70, y, pageW - margin, y);
    doc.setFontSize(9);
    doc.text("Professor Signature", margin, y + 5);
    doc.text("Department Head", pageW - margin, y + 5, { align: "right" });
    doc.text(professorName || "", margin, y + 10);

    // Footer line
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Generated ${new Date().toLocaleString()} · Total students: ${students.length}`,
      margin,
      pageH - 8
    );

    return doc;
  };

  const fileName = () =>
    `attendance_${(course?.code || course?.name || "course").replace(/\s+/g, "_")}_W${week}.pdf`;

  const handlePrint = async () => {
    if (!course) return;
    setGenerating(true);
    try {
      const doc = buildPdf();
      const blobUrl = doc.output("bloburl");
      const win = window.open(blobUrl as any, "_blank");
      if (win) {
        setTimeout(() => {
          try { win.print(); } catch {}
        }, 500);
      }
    } catch (e: any) {
      toast({ title: "Print failed", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!course) return;
    setGenerating(true);
    try {
      const doc = buildPdf();
      doc.save(fileName());
      toast({ title: "Sheet downloaded", description: fileName() });
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold text-foreground">Print Attendance Sheet</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Course summary */}
          <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm">
            <div className="font-semibold text-foreground">
              {course?.name} {course?.code && <span className="text-muted-foreground">· {course.code}</span>}
            </div>
            <div className="text-xs text-muted-foreground">
              {course?.program || "—"} · {students.length} student{students.length === 1 ? "" : "s"}
              {semester && (
                <> · {semester.name} (Year {semester.year} · Sem {semester.semester})</>
              )}
            </div>
          </div>

          {/* No active semester warning */}
          {!semester && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-medium">No active semester configured</div>
                <div className="text-xs opacity-80">Ask an administrator to set a current semester so weeks can be auto-detected.</div>
              </div>
            </div>
          )}

          {/* Smart current-week chips */}
          {semesterWeeks && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                <CalendarDays className="h-3.5 w-3.5" />
                Current Week: Week {semesterWeeks.currentWeek}
              </span>
              {weekRange && (
                <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                  {fmt(weekRange.start)} – {fmt(weekRange.end)}
                </span>
              )}
              {week === semesterWeeks.currentWeek ? (
                <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  Auto-selected
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setWeek(semesterWeeks.currentWeek)}
                  className="rounded-full border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  Reset to current week
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Week</label>
              <select
                className={inputBase}
                value={week}
                onChange={(e) => setWeek(Number(e.target.value))}
                disabled={!semesterWeeks}
              >
                {(semesterWeeks?.weeks ?? Array.from({ length: totalWeeks }).map((_, i) => ({
                  number: i + 1, start: null as any, end: null as any, isCurrent: false, isFuture: false, isPast: false,
                }))).map((w) => {
                  const label = w.start
                    ? `Week ${w.number} · ${fmt(w.start)} – ${fmt(w.end)}`
                    : `Week ${w.number}`;
                  const suffix = w.isCurrent ? " — Current" : w.isFuture ? " — Upcoming" : "";
                  return (
                    <option key={w.number} value={w.number} disabled={w.isFuture}>
                      {label}{suffix}
                    </option>
                  );
                })}
              </select>
              {weekRange && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {fmt(weekRange.start)} – {fmt(weekRange.end)}
                  {semesterWeeks && week < semesterWeeks.currentWeek && " · past week"}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Session Type</label>
              <select className={inputBase} value={sessionType} onChange={(e) => setSessionType(e.target.value as any)}>
                <option>Lecture</option>
                <option>Lab</option>
                <option>Seminar</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Group (optional)</label>
              <input className={inputBase} value={group} onChange={(e) => setGroup(e.target.value)} placeholder="e.g. A" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Section (optional)</label>
              <input className={inputBase} value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. 1" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Room</label>
              <input className={inputBase} value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. A-204" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Time</label>
              <input className={inputBase} value={time} onChange={(e) => setTime(e.target.value)} placeholder="e.g. 10:00–11:30" />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Date override (optional)</label>
              <input type="date" className={inputBase} value={dateOverride} onChange={(e) => setDateOverride(e.target.value)} />
            </div>
          </div>

          {hasExisting && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              <span>
                Existing attendance recorded for week {week} — Present/Absent will be pre-marked from digital records.
              </span>
            </div>
          )}

          {loadingStudents && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading students…
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            disabled={generating || !course}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            Print
          </button>
          <button
            onClick={handleDownload}
            disabled={generating || !course}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSheetDialog;
