import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_SLOTS = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"];

const Timetable = () => {
  const { t } = useTranslation();
  const [filterProgram, setFilterProgram] = useState("");
  const [filterYear, setFilterYear] = useState<number | "">("");
  const [filterSemester, setFilterSemester] = useState<number | "">("");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["public-timetable"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timetable_entries")
        .select("*")
        .order("start_time");
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

  const selectClass = "rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow";

  const getEntriesForSlot = (day: string, time: string) =>
    filtered.filter((e) => e.day_of_week === day && e.start_time <= time && e.end_time > time);

  return (
    <Layout>
      <PageHero
        title={t("timetable.title", "Class Timetable")}
        subtitle={t("timetable.subtitle", "View the weekly class schedule. Use the filters to find your program's timetable.")}
      />

      <section className="section-padding">
        <div className="container">
          <div className="mb-8 flex flex-wrap gap-3">
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

          {isLoading ? (
            <p className="text-center text-muted-foreground">Loading timetable...</p>
          ) : filtered.length === 0 ? (
            <div className="glass-card p-14 text-center text-muted-foreground">
              No timetable entries found for the selected filters.
            </div>
          ) : (
            <div className="overflow-auto rounded-2xl border border-border/50 shadow-sm">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-secondary/70">
                  <tr>
                    <th className="sticky left-0 z-10 bg-secondary/70 px-4 py-3.5 text-left font-semibold text-foreground">Time</th>
                    {DAYS.map((d) => (
                      <th key={d} className="px-4 py-3.5 text-center font-semibold text-foreground min-w-[140px]">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((time) => (
                    <tr key={time} className="border-b border-border/50 last:border-0">
                      <td className="sticky left-0 z-10 bg-card px-4 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">{time}</td>
                      {DAYS.map((day) => {
                        const hits = getEntriesForSlot(day, time);
                        return (
                          <td key={day} className="px-1.5 py-1.5 align-top">
                            {hits.map((entry) => (
                              <div key={entry.id} className="mb-1 rounded-xl bg-primary/8 px-3 py-2 text-xs">
                                <p className="font-semibold text-foreground leading-tight">{entry.course_name}</p>
                                <p className="text-muted-foreground">{entry.start_time}–{entry.end_time}</p>
                                {entry.professor_name && <p className="text-muted-foreground">{entry.professor_name}</p>}
                                {entry.room && <p className="text-muted-foreground">Room: {entry.room}</p>}
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
      </section>
    </Layout>
  );
};

export default Timetable;
