import { useState, useMemo } from "react";
import StudentLayout from "@/components/StudentLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, MapPin, User } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const StudentTimetable = () => {
  const [filterProgram, setFilterProgram] = useState("");
  const [filterYear, setFilterYear] = useState<number | "">("");
  const [filterSemester, setFilterSemester] = useState<number | "">("");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["student-timetable"],
    queryFn: async () => {
      const { data, error } = await supabase.from("timetable_entries").select("*").order("start_time");
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

  const byDay = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    DAYS.forEach((d) => { map[d] = []; });
    filtered.forEach((e) => { if (map[e.day_of_week]) map[e.day_of_week].push(e); });
    return map;
  }, [filtered]);

  const selectClass = "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <StudentLayout>
      <h1 className="font-display text-2xl font-bold text-foreground">Timetable</h1>
      <p className="text-sm text-muted-foreground">View your class schedule</p>

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
          <div className="space-y-6">
            {DAYS.map((day) => {
              const dayEntries = byDay[day];
              if (!dayEntries || dayEntries.length === 0) return null;
              return (
                <div key={day}>
                  <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
                    <Calendar className="h-5 w-5 text-primary" />
                    {day}
                  </h2>
                  <div className="space-y-2">
                    {dayEntries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                        <div>
                          <p className="font-medium text-foreground">{entry.course_name}</p>
                          <p className="text-xs text-primary">{entry.program} · Year {entry.year}</p>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{entry.start_time}–{entry.end_time}</span>
                          {entry.professor_name && <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{entry.professor_name}</span>}
                          {entry.room && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{entry.room}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentTimetable;
