// Generate a Dean's List certificate PDF (landscape).
import { fetchTranscriptSignatureConfig } from "@/lib/transcriptPdf";

export interface DeansCertOptions {
  fullName: string;
  program: string;
  semesterName: string;
  gpaAlbanian: number;
  gpa4?: number;
  rank: number;
  certificateCode: string;
  issuedAt?: Date;
}

export async function downloadDeansListCertificate(opts: DeansCertOptions) {
  const { default: jsPDF } = await import("jspdf");
  const sig = await fetchTranscriptSignatureConfig().catch(() => null);

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Border (gold)
  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(6);
  doc.rect(24, 24, w - 48, h - 48);
  doc.setLineWidth(1);
  doc.rect(36, 36, w - 72, h - 72);

  // Header
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(120, 90, 0);
  doc.text("WESTERN BALKANS UNIVERSITY", w / 2, 80, { align: "center" });

  doc.setFontSize(34);
  doc.setTextColor(20, 20, 20);
  doc.text("Certificate of Academic Excellence", w / 2, 130, { align: "center" });

  doc.setFont("times", "italic");
  doc.setFontSize(16);
  doc.setTextColor(80, 80, 80);
  doc.text("Dean's List Honor", w / 2, 160, { align: "center" });

  // Body
  doc.setFont("times", "normal");
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text("This is to certify that", w / 2, 210, { align: "center" });

  doc.setFont("times", "bold");
  doc.setFontSize(28);
  doc.setTextColor(0, 0, 0);
  doc.text(opts.fullName, w / 2, 250, { align: "center" });

  doc.setFont("times", "normal");
  doc.setFontSize(13);
  doc.setTextColor(50, 50, 50);
  const line1 = `from the program "${opts.program}" has been recognized on the Dean's List`;
  const line2 = `for the ${opts.semesterName} with a GPA of ${opts.gpaAlbanian.toFixed(2)} (Albanian scale)${opts.gpa4 != null ? ` / ${opts.gpa4.toFixed(2)} (4.0 scale)` : ""}.`;
  doc.text(line1, w / 2, 285, { align: "center" });
  doc.text(line2, w / 2, 305, { align: "center" });

  doc.setFont("times", "italic");
  doc.setFontSize(13);
  doc.setTextColor(120, 90, 0);
  doc.text(`Rank #${opts.rank}`, w / 2, 335, { align: "center" });

  // Signature
  const signatureY = h - 110;
  const sigX = w - 240;
  doc.setDrawColor(80, 80, 80);
  doc.line(sigX, signatureY, sigX + 180, signatureY);

  if (sig?.enabled) {
    const sigText = (sig.signature_text || sig.admin_name || "").trim();
    if (sigText) {
      doc.setFont("times", "italic");
      doc.setFontSize(20);
      doc.setTextColor(20, 20, 20);
      doc.text(sigText, sigX + 90, signatureY - 8, { align: "center" });
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(sig.admin_name || "", sigX + 90, signatureY + 14, { align: "center" });
    doc.text(sig.title || "Registrar", sigX + 90, signatureY + 28, { align: "center" });
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text("Office of the Registrar", sigX + 90, signatureY + 14, { align: "center" });
  }

  // Footer code & date
  const issued = opts.issuedAt ?? new Date();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Certificate ID: ${opts.certificateCode}`, 60, h - 50);
  doc.text(`Issued: ${issued.toLocaleDateString()}`, 60, h - 36);

  doc.save(`deans-list-${opts.certificateCode}.pdf`);
}
