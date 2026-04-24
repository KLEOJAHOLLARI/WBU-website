import { supabase } from "@/integrations/supabase/client";

export const SCHOLARSHIP_NAMES = [
  "Merit Excellence Scholarship",
  "Need-Based Grant",
  "International Student Award",
  "Community Leadership",
  "Alumni Family Discount",
  "Sports & Arts Talent",
] as const;

export type ScholarshipName = (typeof SCHOLARSHIP_NAMES)[number];

export const DEFAULT_BASE_DOCUMENTS: string[] = [
  "Completed online admission application",
  "Official high-school or previous-degree transcripts",
  "National ID or passport copy",
  "Motivation letter (max 1 page)",
  "Two letters of recommendation",
  "Awards, certificates, or portfolio (if applicable)",
];

export const DEFAULT_EXTRA_DOCS: Record<ScholarshipName, string[]> = {
  "Merit Excellence Scholarship": [
    "Certified entrance exam result",
    "Academic transcript with GPA ≥ 9.0 / 90%+",
  ],
  "Need-Based Grant": [
    "Proof of family income (last 6 months)",
    "Tax statement or social-services letter",
    "Personal statement explaining financial need",
  ],
  "International Student Award": [
    "Passport copy and proof of residency abroad",
    "Language proficiency certificate (English/Albanian)",
    "Equivalence of foreign diploma (if available)",
  ],
  "Community Leadership": [
    "Documentation of volunteer / community service",
    "Two recommendation letters (mentor / NGO / school)",
    "Leadership essay (max 1 page)",
  ],
  "Alumni Family Discount": [
    "Proof of relation to a WBU alumnus (parent / sibling)",
    "Alumnus diploma copy or graduation year reference",
  ],
  "Sports & Arts Talent": [
    "National ranking certificate or competition results",
    "Coach / mentor recommendation letter",
    "Portfolio, recordings, or performance evidence",
  ],
};

export const SCHOLARSHIP_DOCS_KEY = "scholarship_documents";

export type ScholarshipDocsValue = {
  base: string[];
  extra: Record<string, string[]>;
};

export const DEFAULT_SCHOLARSHIP_DOCS: ScholarshipDocsValue = {
  base: DEFAULT_BASE_DOCUMENTS,
  extra: DEFAULT_EXTRA_DOCS,
};

export type ScholarshipDocsResult = ScholarshipDocsValue & {
  updatedAt: string | null;
};

export const fetchScholarshipDocs = async (): Promise<ScholarshipDocsResult> => {
  const { data, error } = await supabase
    .from("system_settings")
    .select("value, updated_at")
    .eq("key", SCHOLARSHIP_DOCS_KEY)
    .maybeSingle();

  if (error) throw error;
  if (!data?.value) return { ...DEFAULT_SCHOLARSHIP_DOCS, updatedAt: null };
  const v = data.value as Partial<ScholarshipDocsValue>;
  return {
    base: Array.isArray(v.base) && v.base.length ? v.base : DEFAULT_BASE_DOCUMENTS,
    extra: { ...DEFAULT_EXTRA_DOCS, ...(v.extra || {}) },
    updatedAt: data.updated_at ?? null,
  };
};
