import { useState, useMemo } from "react";
import StudentLayout from "@/components/StudentLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSemester } from "@/hooks/useActiveSemester";
import SemesterBadge from "@/components/SemesterBadge";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_SLOTS = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"];

const StudentTimetable = () => {
  const [filterProgram, setFilterProgram] = useState("");
  const [filterYear, setFilterYear] = useState<number | "">("");
  const [filterSemester, setFilterSemester] = useState<number | "">("");
  const { data: activeSemester } = useActiveSemester();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["student-timetable", activeSemester?.year, activeSemester?.semester],
    queryFn: async () => {
      let query = supabase.from("timetable_entries").select("*").order("start_time");
      // Auto-filter by active semester if set
      if (activeSemester) {
        query = query.eq("year", activeSemester.year).eq("semester", activeSemester.semester);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const programs = useMemo(() => [...new Set(entries.map((e) => e.program))].sort(), [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterProgram && e.program !== filterProgram) return false;
      if (filterYear && e.year !== filterYear) return false;
      if (filterSemester && e.semester !== filterSemester) return false;
      return true;
    });
  }, [entries, filterProgram, filterYear, filterSemester]);

  const selectClass = "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  const getEntriesForSlot = (day: string, time: string) =>
    filtered.filter((e) => e.day_of_week === day && e.start_time <= time && e.end_time > time);

  return (
    <StudentLayout>
      <h1 className="font-display text-2xl font-bold text-foreground">Timetable</h1>
      <p className="text-sm text-muted-foreground">View your class schedule</p>
      <div className="mt-2"><SemesterBadge /></div>

      <div className="mt-6 flex flex-wrap gap-4">
        <select value={filterProgram} onChange={(e) => setFilterProgram(e.target.value)} className={selectClass}>
          <option value="">All Programs</option>
          {programs.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value ? Number(e.target.value) : "")} className={selectClass}>
          <option value="">All Years</option>
          {[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}
        </select>
        <select value={filterSemester} onChange={(e) => setFilterSemester(e.target.value ? Number(e.target.value) : "")} className={selectClass}>
          <option value="">All Semesters</option>
          {[1, 2].map((s) => <option key={s} value={s}>Semester {s}</option>)}
        </select>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            No timetable entries found.
          </div>
        ) : (
          <div className="overflow-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary">
                <tr>
                  <th className="sticky left-0 z-10 bg-secondary px-3 py-3 text-left font-medium text-foreground">Time</th>
                  {DAYS.map((d) => (
                    <th key={d} className="px-3 py-3 text-center font-medium text-foreground min-w-[130px]">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((time) => (
                  <tr key={time} className="border-b border-border last:border-0">
                    <td className="sticky left-0 z-10 bg-card px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">{time}</td>
                    {DAYS.map((day) => {
                      const hits = getEntriesForSlot(day, time);
                      return (
                        <td key={day} className="px-1 py-1 align-top">
                          {hits.map((entry) => (
                            <div key={entry.id} className="mb-1 rounded-md bg-primary/10 px-2 py-1.5 text-xs">
                              <p className="font-semibold text-foreground leading-tight">{entry.course_name}</p>
                              <p className="text-muted-foreground">{entry.start_time}–{entry.end_time}</p>
                              {entry.professor_name && <p className="text-muted-foreground">{entry.professor_name}</p>}
                              {entry.room && <p className="text-muted-foreground">{entry.room}</p>}
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentTimetable;
