import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Award, Medal } from "lucide-react";

const rankAccent = (r: number) => {
  if (r === 1) return { ring: "ring-amber-400", bg: "from-amber-300/30 to-amber-500/20", text: "text-amber-600", icon: <Trophy className="h-7 w-7" /> };
  if (r === 2) return { ring: "ring-slate-300", bg: "from-slate-200/50 to-slate-400/20", text: "text-slate-500", icon: <Medal className="h-7 w-7" /> };
  if (r === 3) return { ring: "ring-orange-400", bg: "from-orange-300/30 to-orange-500/20", text: "text-orange-600", icon: <Medal className="h-7 w-7" /> };
  return { ring: "ring-border", bg: "from-muted/30 to-muted/10", text: "text-foreground", icon: <Award className="h-6 w-6 text-muted-foreground" /> };
};

const DeansListPreview = () => {
  const [params] = useSearchParams();
  const semesterId = params.get("semester") || "";
  const program = params.get("program") || "all";
  const threshold = Number(params.get("threshold") ?? 9.0);
  const minCourses = Number(params.get("min_courses") ?? 3);
  const title = params.get("title") || "President's Honor List — Preview";

  const { data: semesterName } = useQuery({
    queryKey: ["preview-semester-name", semesterId],
    enabled: !!semesterId,
    queryFn: async () => {
      const { data } = await supabase.from("academic_semesters").select("name").eq("id", semesterId).maybeSingle();
      return data?.name || "";
    },
  });

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["preview-deans-list", semesterId, program, threshold, minCourses],
    enabled: !!semesterId,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("preview_deans_list", {
        _semester_id: semesterId,
        _program: program === "all" ? null : program,
        _threshold: threshold,
        _min_courses: minCourses,
      });
      if (error) throw error;
      return data || [];
    },
  });

  const top3 = useMemo(() => rows.slice(0, 3), [rows]);
  const rest = useMemo(() => rows.slice(3), [rows]);

  return (
    <Layout>
      <PageHero
        title={title}
        subtitle={`Live preview${semesterName ? ` — ${semesterName}` : ""}${program !== "all" ? ` · ${program}` : ""} · GPA ≥ ${threshold.toFixed(2)} · ≥ ${minCourses} courses`}
      />

      <section className="container mx-auto px-4 py-12">
        <div className="mb-6 flex items-center gap-2">
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">Preview</Badge>
          <span className="text-sm text-muted-foreground">This page reflects current settings and is not yet published.</span>
        </div>

        {!semesterId ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">Missing semester parameter.</CardContent></Card>
        ) : isLoading ? (
          <p className="text-center text-muted-foreground py-12">Loading…</p>
        ) : error ? (
          <Card><CardContent className="py-16 text-center text-destructive">Failed to load preview.</CardContent></Card>
        ) : rows.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">
            No students match the current criteria.
          </CardContent></Card>
        ) : (
          <>
            {top3.length > 0 && (
              <div className="grid gap-6 md:grid-cols-3 mb-10">
                {top3.map((e: any) => {
                  const a = rankAccent(e.rank);
                  return (
                    <motion.div key={`${e.student_id}-${e.rank}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: e.rank * 0.05 }}>
                      <Card className={`relative overflow-hidden ring-2 ${a.ring}`}>
                        <div className={`absolute inset-0 bg-gradient-to-br ${a.bg} opacity-60 pointer-events-none`} />
                        <CardContent className="relative pt-8 pb-6 text-center">
                          <div className={`inline-flex items-center justify-center h-14 w-14 rounded-full bg-card shadow-sm mb-3 ${a.text}`}>
                            {a.icon}
                          </div>
                          <div className={`text-5xl font-bold ${a.text}`}>#{e.rank}</div>
                          <div className="mt-3 text-lg font-semibold">{e.full_name}</div>
                          <div className="text-sm text-muted-foreground">{e.program}</div>
                          <div className="mt-3 text-sm">
                            <Badge variant="outline" className="font-mono">GPA {Number(e.gpa_albanian).toFixed(2)} / 10</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {rest.length > 0 && (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="text-left px-4 py-3 w-16">Rank</th>
                          <th className="text-left px-4 py-3">Student</th>
                          <th className="text-left px-4 py-3">Program</th>
                          <th className="text-right px-4 py-3">GPA (10)</th>
                          <th className="text-right px-4 py-3">GPA (4.0)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rest.map((e: any) => (
                          <tr key={`${e.student_id}-${e.rank}`} className="border-t border-border hover:bg-muted/30">
                            <td className="px-4 py-3 font-semibold">#{e.rank}</td>
                            <td className="px-4 py-3">{e.full_name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{e.program}</td>
                            <td className="px-4 py-3 text-right font-mono">{Number(e.gpa_albanian).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-mono">{Number(e.gpa_4).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </section>
    </Layout>
  );
};

export default DeansListPreview;
