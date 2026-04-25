import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export type DocumentType = "certificate" | "letter" | "contract" | "acceptance_letter";

export interface TemplateVariable {
  key: string;
  label: string;
  required?: boolean;
  type?: "text" | "textarea" | "date";
  defaultValue?: string;
  source?: "student" | "input" | "auto";
}

export interface DocumentTemplate {
  key: string;
  type: DocumentType;
  name: string;
  description: string;
  variables: TemplateVariable[];
  render: (vars: Record<string, string>, opts: RenderOptions) => Promise<jsPDF>;
}

export interface RenderOptions {
  referenceCode: string;
  issuedAt: Date;
  university: { name: string; address: string; website: string };
}

const UNI = {
  name: "Western Balkans University",
  address: "Tirana, Albania",
  website: "wbu.edu.al",
};

// ---------- helpers ----------
const addHeader = (doc: jsPDF, opts: RenderOptions) => {
  // Top bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(opts.university.name, 15, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(opts.university.address, 15, 19);
  doc.text(opts.university.website, 15, 24);
};

const addFooter = async (doc: jsPDF, opts: RenderOptions) => {
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(200);
  doc.line(15, pageH - 30, 195, pageH - 30);

  // QR code
  const verifyUrl = `https://${opts.university.website}/verify/${opts.referenceCode}`;
  try {
    const qr = await QRCode.toDataURL(verifyUrl, { margin: 0, width: 200 });
    doc.addImage(qr, "PNG", 15, pageH - 26, 18, 18);
  } catch {}

  doc.setTextColor(80);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Reference: ${opts.referenceCode}`, 38, pageH - 20);
  doc.text(`Issued: ${opts.issuedAt.toLocaleDateString()}`, 38, pageH - 15);
  doc.text(`Verify at: ${verifyUrl}`, 38, pageH - 10);

  // Signature block right
  doc.setDrawColor(120);
  doc.line(140, pageH - 18, 195, pageH - 18);
  doc.setFontSize(8);
  doc.text("Authorized Signature", 140, pageH - 14);
  doc.text(opts.university.name, 140, pageH - 10);
};

const wrapText = (doc: jsPDF, text: string, x: number, y: number, maxW: number, lineH = 6) => {
  const lines = doc.splitTextToSize(text, maxW);
  doc.text(lines, x, y);
  return y + lines.length * lineH;
};

// ---------- Certificate ----------
const renderCertificate = async (vars: Record<string, string>, opts: RenderOptions) => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  // Border
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(2);
  doc.rect(8, 8, 281, 194);
  doc.setLineWidth(0.4);
  doc.rect(12, 12, 273, 186);

  // Title
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(opts.university.name.toUpperCase(), 148.5, 30, { align: "center" });

  doc.setFontSize(36);
  doc.text("CERTIFICATE", 148.5, 60, { align: "center" });
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text(vars.certificate_subtitle || "of Achievement", 148.5, 70, { align: "center" });

  // Body
  doc.setFontSize(13);
  doc.text("This is to certify that", 148.5, 92, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(2, 132, 199);
  doc.text(vars.full_name || "Student Name", 148.5, 108, { align: "center" });

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  const body = vars.body || `has successfully completed the program of ${vars.program || ""} and is hereby recognized for outstanding academic achievement.`;
  let y = 122;
  const lines = doc.splitTextToSize(body, 220);
  doc.text(lines, 148.5, y, { align: "center" });
  y += lines.length * 6;

  doc.setFontSize(11);
  doc.text(`Issued on ${opts.issuedAt.toLocaleDateString()}`, 148.5, 160, { align: "center" });

  // QR + ref bottom-left
  const verifyUrl = `https://${opts.university.website}/verify/${opts.referenceCode}`;
  try {
    const qr = await QRCode.toDataURL(verifyUrl, { margin: 0, width: 200 });
    doc.addImage(qr, "PNG", 20, 170, 22, 22);
  } catch {}
  doc.setFontSize(8);
  doc.setTextColor(90);
  doc.text(`Ref: ${opts.referenceCode}`, 45, 180);
  doc.text(`Verify: ${verifyUrl}`, 45, 185);

  // Signature line right
  doc.setDrawColor(15, 23, 42);
  doc.line(220, 180, 275, 180);
  doc.setFontSize(9);
  doc.setTextColor(40);
  doc.text("Rector", 247.5, 186, { align: "center" });

  return doc;
};

// ---------- Letter ----------
const renderLetter = async (vars: Record<string, string>, opts: RenderOptions) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  addHeader(doc, opts);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(opts.issuedAt.toLocaleDateString(), 195, 40, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(vars.subject || "Official Letter", 15, 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  let y = 62;
  doc.text(`To: ${vars.full_name || ""}`, 15, y); y += 6;
  if (vars.program) { doc.text(`Program: ${vars.program}`, 15, y); y += 6; }
  if (vars.student_id) { doc.text(`Student ID: ${vars.student_id}`, 15, y); y += 6; }
  y += 4;

  doc.text("Dear " + (vars.full_name || "Student") + ",", 15, y); y += 8;

  doc.setFontSize(11);
  y = wrapText(doc, vars.body || "Letter body goes here.", 15, y, 180, 6);
  y += 10;
  doc.text("Sincerely,", 15, y); y += 6;
  doc.setFont("helvetica", "bold");
  doc.text(vars.signed_by || "Office of the Registrar", 15, y);
  doc.setFont("helvetica", "normal");

  await addFooter(doc, opts);
  return doc;
};

// ---------- Contract ----------
const renderContract = async (vars: Record<string, string>, opts: RenderOptions) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  addHeader(doc, opts);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(vars.contract_title || "STUDENT ENROLLMENT CONTRACT", 105, 45, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Contract No.: ${opts.referenceCode}`, 15, 55);
  doc.text(`Date: ${opts.issuedAt.toLocaleDateString()}`, 195, 55, { align: "right" });

  let y = 68;
  doc.setFont("helvetica", "bold");
  doc.text("Parties", 15, y); y += 6;
  doc.setFont("helvetica", "normal");
  y = wrapText(doc, `1. ${opts.university.name} ("the University"), located at ${opts.university.address}.`, 15, y, 180);
  y = wrapText(doc, `2. ${vars.full_name || ""} ("the Student"), Personal ID: ${vars.personal_id || "—"}, enrolled in ${vars.program || ""}.`, 15, y + 1, 180);

  y += 6;
  doc.setFont("helvetica", "bold"); doc.text("Terms", 15, y); y += 6;
  doc.setFont("helvetica", "normal");
  const terms = vars.terms || `The Student agrees to abide by the academic regulations of the University throughout the duration of the program. Tuition fees of ${vars.tuition_amount || "—"} ${vars.currency || "EUR"} per semester are due by the start of each academic term.`;
  y = wrapText(doc, terms, 15, y, 180);

  y += 6;
  doc.setFont("helvetica", "bold"); doc.text("Duration", 15, y); y += 6;
  doc.setFont("helvetica", "normal");
  y = wrapText(doc, `From ${vars.start_date || opts.issuedAt.toLocaleDateString()} to ${vars.end_date || "completion of the program"}.`, 15, y, 180);

  // Signatures
  y = Math.max(y + 20, 215);
  doc.setDrawColor(80);
  doc.line(20, y, 85, y); doc.line(125, y, 190, y);
  doc.setFontSize(9);
  doc.text("Student Signature", 52.5, y + 5, { align: "center" });
  doc.text("University Representative", 157.5, y + 5, { align: "center" });
  doc.text(vars.full_name || "", 52.5, y + 10, { align: "center" });
  doc.text(vars.signed_by || "Office of the Rector", 157.5, y + 10, { align: "center" });

  await addFooter(doc, opts);
  return doc;
};

// ---------- Acceptance Letter ----------
const renderAcceptance = async (vars: Record<string, string>, opts: RenderOptions) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  addHeader(doc, opts);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(opts.issuedAt.toLocaleDateString(), 195, 40, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("LETTER OF ACCEPTANCE", 105, 55, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  let y = 70;
  doc.text(`Dear ${vars.full_name || "Applicant"},`, 15, y); y += 8;

  const intro = `We are pleased to inform you that your application to ${opts.university.name} for the program of ${vars.program || ""} has been reviewed and ACCEPTED.`;
  y = wrapText(doc, intro, 15, y, 180); y += 4;

  const details = vars.details || `You are hereby admitted as a full-time student starting ${vars.start_date || "the upcoming academic semester"}. Please complete enrollment formalities by ${vars.deadline || "the deadline communicated by the registrar"}.`;
  y = wrapText(doc, details, 15, y, 180); y += 6;

  doc.setFont("helvetica", "bold");
  y = wrapText(doc, `Student ID assigned: ${vars.student_id || "—"}`, 15, y, 180);
  doc.setFont("helvetica", "normal");

  y += 6;
  y = wrapText(doc, vars.body || "We warmly welcome you to our academic community and look forward to supporting your educational journey.", 15, y, 180);

  y += 10;
  doc.text("Sincerely,", 15, y); y += 6;
  doc.setFont("helvetica", "bold");
  doc.text(vars.signed_by || "Admissions Office", 15, y);

  await addFooter(doc, opts);
  return doc;
};

// ---------- Registry ----------
export const TEMPLATES: DocumentTemplate[] = [
  {
    key: "certificate_achievement",
    type: "certificate",
    name: "Certificate of Achievement",
    description: "Landscape certificate recognizing a student achievement.",
    variables: [
      { key: "full_name", label: "Full Name", source: "student", required: true },
      { key: "program", label: "Program", source: "student" },
      { key: "certificate_subtitle", label: "Subtitle", defaultValue: "of Achievement" },
      { key: "body", label: "Body Text", type: "textarea" },
    ],
    render: renderCertificate,
  },
  {
    key: "certificate_enrollment",
    type: "certificate",
    name: "Certificate of Enrollment",
    description: "Landscape certificate confirming enrollment status.",
    variables: [
      { key: "full_name", label: "Full Name", source: "student", required: true },
      { key: "program", label: "Program", source: "student" },
      { key: "certificate_subtitle", label: "Subtitle", defaultValue: "of Enrollment" },
      { key: "body", label: "Body Text", type: "textarea", defaultValue: "is officially enrolled as a registered student of the university for the current academic year." },
    ],
    render: renderCertificate,
  },
  {
    key: "letter_general",
    type: "letter",
    name: "Official Letter",
    description: "Generic official letter on letterhead.",
    variables: [
      { key: "full_name", label: "Recipient Name", source: "student", required: true },
      { key: "student_id", label: "Student ID", source: "student" },
      { key: "program", label: "Program", source: "student" },
      { key: "subject", label: "Subject", required: true, defaultValue: "Official Letter" },
      { key: "body", label: "Letter Body", type: "textarea", required: true },
      { key: "signed_by", label: "Signed By", defaultValue: "Office of the Registrar" },
    ],
    render: renderLetter,
  },
  {
    key: "contract_enrollment",
    type: "contract",
    name: "Student Enrollment Contract",
    description: "Formal enrollment contract between university and student.",
    variables: [
      { key: "full_name", label: "Student Name", source: "student", required: true },
      { key: "personal_id", label: "Personal ID", source: "student" },
      { key: "program", label: "Program", source: "student" },
      { key: "contract_title", label: "Contract Title", defaultValue: "STUDENT ENROLLMENT CONTRACT" },
      { key: "tuition_amount", label: "Tuition Amount" },
      { key: "currency", label: "Currency", defaultValue: "EUR" },
      { key: "start_date", label: "Start Date", type: "date" },
      { key: "end_date", label: "End Date", type: "date" },
      { key: "terms", label: "Terms", type: "textarea" },
      { key: "signed_by", label: "University Representative", defaultValue: "Office of the Rector" },
    ],
    render: renderContract,
  },
  {
    key: "acceptance_letter",
    type: "acceptance_letter",
    name: "Acceptance Letter",
    description: "Formal admission acceptance letter.",
    variables: [
      { key: "full_name", label: "Applicant Name", source: "student", required: true },
      { key: "student_id", label: "Assigned Student ID", source: "student" },
      { key: "program", label: "Program", source: "student", required: true },
      { key: "start_date", label: "Start Date", type: "date" },
      { key: "deadline", label: "Enrollment Deadline", type: "date" },
      { key: "details", label: "Admission Details", type: "textarea" },
      { key: "body", label: "Closing Body", type: "textarea" },
      { key: "signed_by", label: "Signed By", defaultValue: "Admissions Office" },
    ],
    render: renderAcceptance,
  },
];

export const getTemplate = (key: string) => TEMPLATES.find(t => t.key === key);

export const generateDocumentBlob = async (
  template: DocumentTemplate,
  variables: Record<string, string>,
  referenceCode: string,
): Promise<Blob> => {
  const doc = await template.render(variables, {
    referenceCode,
    issuedAt: new Date(),
    university: UNI,
  });
  return doc.output("blob");
};

export const DOC_TYPE_LABEL: Record<DocumentType, string> = {
  certificate: "Certificate",
  letter: "Letter",
  contract: "Contract",
  acceptance_letter: "Acceptance Letter",
};
