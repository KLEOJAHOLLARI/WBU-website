import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, User } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

  const byDay = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    DAYS.forEach((d) => { map[d] = []; });
    filtered.forEach((e) => {
      if (map[e.day_of_week]) map[e.day_of_week].push(e);
    });
    return map;
  }, [filtered]);

  const selectClass = "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-secondary py-16 text-center">
        <div className="container">
          <h1 className="font-display text-4xl font-bold text-foreground md:text-5xl">
            {t("timetable.title", "Class Timetable")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            {t("timetable.subtitle", "View the weekly class schedule. Use the filters to find your program's timetable.")}
          </p>
        </div>
      </section>

      <section className="container py-12">
        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-4">
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
          <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
            No timetable entries found for the selected filters.
          </div>
        ) : (
          <div className="space-y-8">
            {DAYS.map((day) => {
              const dayEntries = byDay[day];
              if (!dayEntries || dayEntries.length === 0) return null;
              return (
                <div key={day}>
                  <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold text-foreground">
                    <Calendar className="h-5 w-5 text-primary" />
                    {day}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {dayEntries.map((entry, i) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-xl border border-border bg-card p-5"
                      >
                        <h3 className="font-display text-base font-semibold text-foreground">{entry.course_name}</h3>
                        <p className="mt-1 text-xs font-medium text-primary">{entry.program} · Year {entry.year}</p>
                        <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5" />
                            {entry.start_time} – {entry.end_time}
                          </div>
                          {entry.professor_name && (
                            <div className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5" />
                              {entry.professor_name}
                            </div>
                          )}
                          {entry.room && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5" />
                              {entry.room}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </Layout>
  );
};

export default Timetable;
