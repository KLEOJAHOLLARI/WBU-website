// Centralized grade conversion logic — Albanian academic scale.
//
// Conversion table (percentage → Albanian grade → letter → GPA on 4.0 scale)
//   90–100  → 10  → A   → 4.00
//   85–89   →  9  → A-  → 3.50
//   75–84   →  8  → B   → 3.00
//   65–74   →  7  → B-  → 2.50
//   55–64   →  6  → C   → 2.00
//   45–54   →  5  → D   → 1.00
//   0–44    →  4  → F   → 0.00
//
// The Albanian system also uses 4 as the failing grade (no "below 4").
// GPA threshold for scholarship eligibility (Albanian 10-scale): 8.5

export const SCHOLARSHIP_GPA_THRESHOLD = 8.5; // Albanian scale (out of 10)

export interface GradeInfo {
  percent: number;          // 0–100
  albanian: number;         // 4–10
  letter: string;           // A, A-, B, B-, C, D, F
  gpa: number;              // 0.00 – 4.00
}

export function percentToAlbanian(pct: number): number {
  if (pct >= 90) return 10;
  if (pct >= 85) return 9;
  if (pct >= 75) return 8;
  if (pct >= 65) return 7;
  if (pct >= 55) return 6;
  if (pct >= 45) return 5;
  return 4;
}

export function percentToLetter(pct: number): string {
  if (pct >= 90) return "A";
  if (pct >= 85) return "A-";
  if (pct >= 75) return "B";
  if (pct >= 65) return "B-";
  if (pct >= 55) return "C";
  if (pct >= 45) return "D";
  return "F";
}

export function percentToGPA(pct: number): number {
  if (pct >= 90) return 4.0;
  if (pct >= 85) return 3.5;
  if (pct >= 75) return 3.0;
  if (pct >= 65) return 2.5;
  if (pct >= 55) return 2.0;
  if (pct >= 45) return 1.0;
  return 0.0;
}

export function describeGrade(pct: number): GradeInfo {
  return {
    percent: Math.max(0, Math.min(100, pct)),
    albanian: percentToAlbanian(pct),
    letter: percentToLetter(pct),
    gpa: percentToGPA(pct),
  };
}

/** Format a percentage with its Albanian-scale equivalent for display. */
export function formatGradeWithAlbanian(pct: number | null | undefined): string {
  if (pct == null || Number.isNaN(pct)) return "—";
  return `${Math.round(pct)}% → ${percentToAlbanian(pct)} (${percentToLetter(pct)})`;
}

export type ScholarshipReason = "ok" | "low_gpa" | "low_attendance" | "both" | "no_data";
export type ScholarshipStatus = "active" | "warning" | "lost" | "inactive";

export interface ScholarshipEvaluation {
  status: ScholarshipStatus;        // active | warning | lost | inactive
  reason: ScholarshipReason;        // why it's not active
  gpaAlbanian: number | null;       // current GPA on 10-scale
  gpaMet: boolean;                  // true when GPA ≥ threshold
  attendanceMet: boolean;           // true when attendance requirement satisfied
  hasGradeData: boolean;            // false if there are no grades to compute GPA
}

/**
 * Evaluate scholarship status based on attendance + GPA requirements.
 *
 * @param hasScholarship  whether the student is currently flagged as a scholarship holder
 * @param attendanceMet   pre-computed boolean from existing attendance logic
 * @param gpaAlbanian     current weighted GPA on the Albanian 10-scale (or null when no graded courses)
 */
export function evaluateScholarship(
  hasScholarship: boolean,
  attendanceMet: boolean,
  gpaAlbanian: number | null
): ScholarshipEvaluation {
  if (!hasScholarship) {
    return {
      status: "inactive",
      reason: "ok",
      gpaAlbanian,
      gpaMet: false,
      attendanceMet,
      hasGradeData: gpaAlbanian != null,
    };
  }

  const hasGradeData = gpaAlbanian != null;
  const gpaMet = hasGradeData ? (gpaAlbanian as number) >= SCHOLARSHIP_GPA_THRESHOLD : false;

  // Without any grade data, we can't punish the student — show a "warning" if attendance is also low.
  if (!hasGradeData) {
    if (!attendanceMet) {
      return {
        status: "warning",
        reason: "low_attendance",
        gpaAlbanian,
        gpaMet,
        attendanceMet,
        hasGradeData,
      };
    }
    return {
      status: "warning",
      reason: "no_data",
      gpaAlbanian,
      gpaMet,
      attendanceMet,
      hasGradeData,
    };
  }

  if (gpaMet && attendanceMet) {
    return { status: "active", reason: "ok", gpaAlbanian, gpaMet, attendanceMet, hasGradeData };
  }

  let reason: ScholarshipReason = "ok";
  if (!gpaMet && !attendanceMet) reason = "both";
  else if (!gpaMet) reason = "low_gpa";
  else reason = "low_attendance";

  return { status: "lost", reason, gpaAlbanian, gpaMet, attendanceMet, hasGradeData };
}

export const reasonLabel = (r: ScholarshipReason): string => {
  switch (r) {
    case "low_gpa": return "Low GPA";
    case "low_attendance": return "Low attendance";
    case "both": return "Low GPA & attendance";
    case "no_data": return "No grades yet";
    default: return "Eligible";
  }
};
