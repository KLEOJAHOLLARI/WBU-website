/**
 * Hour-based attendance utilities.
 *
 * Each attendance_session has `hours` (defaults to course.hours_per_week).
 * Each attendance_record links a student (enrollment) to a session with a status.
 *
 * Rules:
 * - Only sessions where the student has a record (present/absent/excused) count.
 * - Sessions with no record for that student are ignored (don't count against them).
 * - Present + Excused → counted as attended hours.
 * - Absent → counted as missed hours (in the denominator only).
 *
 * Formula:  attended_hours / total_recorded_hours * 100
 */

export const DEFAULT_ATTENDANCE_THRESHOLD = 75;

export type AttendanceSession = {
  id: string;
  hours?: number | null;
  week_number?: number;
  session_date?: string;
};

export type AttendanceRecord = {
  id: string;
  session_id: string;
  enrollment_id: string;
  status: string; // 'present' | 'absent' | 'excused'
};

export type AttendanceStats = {
  attendedHours: number;
  totalHours: number;
  percentage: number | null; // null when nothing recorded
  isEligible: boolean;
};

const ATTENDED_STATUSES = new Set(["present", "excused"]);

export function computeAttendanceForEnrollment(
  enrollmentId: string,
  sessions: AttendanceSession[],
  records: AttendanceRecord[],
  threshold: number = DEFAULT_ATTENDANCE_THRESHOLD
): AttendanceStats {
  const sessionMap = new Map(sessions.map((s) => [s.id, s]));
  let attendedHours = 0;
  let totalHours = 0;

  for (const r of records) {
    if (r.enrollment_id !== enrollmentId) continue;
    const s = sessionMap.get(r.session_id);
    if (!s) continue;
    const hrs = Number(s.hours) > 0 ? Number(s.hours) : 2;
    totalHours += hrs;
    if (ATTENDED_STATUSES.has(r.status)) attendedHours += hrs;
  }

  const percentage = totalHours > 0 ? Math.round((attendedHours / totalHours) * 100) : null;
  const isEligible = percentage === null ? true : percentage >= threshold;

  return { attendedHours, totalHours, percentage, isEligible };
}
