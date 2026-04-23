// Shared transcript PDF generator used by Student, Professor, and Admin views.
// Renders the existing transcript layout PLUS an optional verification footer with
// admin signature, name, title, label, verification ID, issue date, and a QR code.
//
// Behavior is fully backward-compatible: when no signature config is configured
// (or `enabled = false`), the PDF renders exactly as before.

import { supabase } from "@/integrations/supabase/client";
import {
  gradeToLetter,
  gradeToAlbanian,
  type TranscriptRow,
  type TranscriptSummary,
} from "@/lib/transcript";
import type { GradeDisplayMode } from "@/lib/grading";

export interface TranscriptStudentMeta {
  full_name: string | null | undefined;
  email: string | null | undefined;
  program: string | null | undefined;
  student_id?: string | null;
}

export interface TranscriptSignatureConfig {
  enabled: boolean;
  admin_user_id: string | null;
  admin_name: string;
  title: string;
  label: string;
  /** Text rendered as the stylised signature. Falls back to admin_name. */
  signature_text?: string;
  /** Font style for the signature text. */
  signature_font?: "script" | "italic" | "bold";
  /** Legacy — image-based signature (kept for backwards compat, no longer used). */
  signature_path: string | null;
}

const DEFAULT_SIGNATURE_CONFIG: TranscriptSignatureConfig = {
  enabled: false,
  admin_user_id: null,
  admin_name: "",
  title: "Registrar",
  label: "Verified by Administration",
  signature_text: "",
  signature_font: "script",
  signature_path: null,
};

/** Fetch the current transcript signature settings (safe fallback if missing). */
export async function fetchTranscriptSignatureConfig(): Promise<TranscriptSignatureConfig> {
  try {
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "transcript_signature")
      .maybeSingle();
    if (!data?.value) return DEFAULT_SIGNATURE_CONFIG;
    return { ...DEFAULT_SIGNATURE_CONFIG, ...(data.value as object) } as TranscriptSignatureConfig;
  } catch {
    return DEFAULT_SIGNATURE_CONFIG;
  }
}

/** Convert a Blob to a base64 data URL (jsPDF needs data URLs for addImage). */
const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

/** Resolve a signed URL for the signature image and return as base64 data URL. */
async function loadSignatureImage(path: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .storage
      .from("transcript-signatures")
      .createSignedUrl(path, 60);
    if (error || !data?.signedUrl) return null;
    const res = await fetch(data.signedUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

/** Generate a short, printable verification ID (used in footer + QR payload). */
function makeVerificationId(student: TranscriptStudentMeta): string {
  const ts = new Date();
  const date = `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, "0")}${String(ts.getDate()).padStart(2, "0")}`;
  const studentTag = (student.student_id || student.email || "STU")
    .replace(/[^A-Z0-9]/gi, "")
    .slice(0, 6)
    .toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `WBU-${date}-${studentTag || "STU"}-${random}`;
}

export interface BuildTranscriptPdfOptions {
  student: TranscriptStudentMeta;
  rows: TranscriptRow[];
  summary: TranscriptSummary;
  /** When omitted, signature config is fetched from system settings. */
  signatureConfig?: TranscriptSignatureConfig;
  /** Override the computed file name (without extension). */
  fileName?: string;
}

/**
 * Build, render and trigger the download of the transcript PDF.
 * Mirrors the previous layout 1:1, then appends the verification block.
 */
export async function downloadTranscriptPdf(opts: BuildTranscriptPdfOptions): Promise<void> {
  const { student, rows, summary } = opts;

  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Academic Transcript", pageW / 2, 20, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Western Balkan University", pageW / 2, 28, { align: "center" });

  // ── Student info ──────────────────────────────────────────────────────────
  doc.setFontSize(10);
  const infoY = 40;
  doc.text(`Student: ${student.full_name || "N/A"}`, 14, infoY);
  doc.text(`Email: ${student.email || "N/A"}`, 14, infoY + 6);
  doc.text(`Program: ${student.program || "N/A"}`, 14, infoY + 12);
  if (student.student_id) {
    doc.text(`Student ID: ${student.student_id}`, 14, infoY + 18);
  }
  doc.text(`Date: ${new Date().toLocaleDateString()}`, pageW - 14, infoY, { align: "right" });

  // ── Course table ──────────────────────────────────────────────────────────
  // Note: jsPDF's default WinAnsi encoding doesn't support the "→" arrow
  // (it renders as "!'"), so we use ASCII "->" inside the PDF.
  const tableData = rows.map((r) => [
    r.courseName,
    r.courseCode,
    r.grade !== null
      ? `${r.grade.toFixed(1)}% -> ${gradeToAlbanian(r.grade)} (${gradeToLetter(r.grade)})`
      : "-",
    r.ects.toString(),
    `Y${r.year}/S${r.semester}`,
    r.status,
  ]);

  autoTable(doc, {
    startY: infoY + (student.student_id ? 26 : 20),
    head: [["Course", "Code", "Grade", "ECTS", "Semester", "Status"]],
    body: tableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 58, 138] },
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  let y = (doc as any).lastAutoTable.finalY + 12;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Total ECTS Earned: ${summary.totalECTS}`, 14, y + 8);
  doc.text(`Total Institutional Credits: ${summary.totalInstitutionalCredits}`, 14, y + 14);
  doc.text(`CGPA: ${summary.cgpa.toFixed(2)} / 4.00`, 14, y + 20);
  doc.text(`GPA (Albanian): ${summary.gpaAlbanian.toFixed(2)} / 10.00`, 14, y + 26);
  doc.text(`Weighted Average: ${summary.weightedAvg.toFixed(2)}%`, 14, y + 32);

  // Push downstream y reference forward to account for the extra line.
  y += 6;

  // ── Verification footer ───────────────────────────────────────────────────
  const config = opts.signatureConfig ?? (await fetchTranscriptSignatureConfig());
  if (config.enabled) {
    const verificationId = makeVerificationId(student);
    const issuedOn = new Date().toLocaleDateString(undefined, {
      year: "numeric", month: "long", day: "numeric",
    });

    // QR code with verification payload — generated as data URL
    let qrDataUrl: string | null = null;
    try {
      const QRCode = (await import("qrcode")).default;
      const payload = JSON.stringify({
        v: 1,
        id: verificationId,
        student: student.full_name || "",
        program: student.program || "",
        issued: new Date().toISOString(),
      });
      qrDataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 220 });
    } catch {
      qrDataUrl = null;
    }

    // (Image-based signature removed — now rendered as styled text.)

    // Reserve room — push to bottom of page (with safe top margin from summary)
    const blockHeight = 50;
    const blockY = Math.max(y + 36, pageH - blockHeight - 20);

    // Divider
    doc.setDrawColor(200);
    doc.line(14, blockY, pageW - 14, blockY);

    // Left: label + verification details + QR
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(config.label || "Verified by Administration", 14, blockY + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(90);
    doc.text(`Verification ID: ${verificationId}`, 14, blockY + 14);
    doc.text(`Issued: ${issuedOn}`, 14, blockY + 19);
    doc.setTextColor(0);

    if (qrDataUrl) {
      try { doc.addImage(qrDataUrl, "PNG", 14, blockY + 22, 22, 22); } catch { /* ignore */ }
      doc.setFontSize(7);
      doc.setTextColor(120);
      doc.text("Scan to verify", 14, blockY + 47);
      doc.setTextColor(0);
    }

    // Right: typed signature + name + title
    const rightX = pageW - 14;
    const sigBoxW = 70;
    const sigX = rightX - sigBoxW;
    const sigBaselineY = blockY + 22;

    // Render the signature as styled text (no image upload required)
    const signatureText = (config.signature_text || config.admin_name || "").trim();
    const fontStyle = config.signature_font ?? "script";

    if (signatureText) {
      // jsPDF doesn't ship a script font; we approximate per chosen style.
      if (fontStyle === "bold") {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
      } else if (fontStyle === "italic") {
        doc.setFont("times", "italic");
        doc.setFontSize(24);
      } else {
        // "script" — closest built-in approximation
        doc.setFont("times", "italic");
        doc.setFontSize(28);
      }
      doc.setTextColor(20, 30, 80);
      doc.text(signatureText, rightX, sigBaselineY, { align: "right" });
      doc.setTextColor(0);
    }

    // Signature line
    doc.setDrawColor(120);
    doc.line(sigX, sigBaselineY + 3, rightX, sigBaselineY + 3);

    // Name + title under the signature line
    const nameY = sigBaselineY + 9;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(config.admin_name || "—", rightX, nameY, { align: "right" });
    if (config.title) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(90);
      doc.text(config.title, rightX, nameY + 5, { align: "right" });
      doc.setTextColor(0);
    }
  }

  const filename = opts.fileName
    ? `${opts.fileName}.pdf`
    : `transcript_${(student.full_name || "student").replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
}
