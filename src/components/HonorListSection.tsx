import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Award, Medal } from "lucide-react";

const rankAccent = (r: number) => {
  if (r === 1) return { ring: "ring-amber-400", bg: "from-amber-300/30 to-amber-500/20", text: "text-amber-600", icon: <Trophy className="h-7 w-7" /> };
  if (r === 2) return { ring: "ring-slate-300", bg: "from-slate-200/50 to-slate-400/20", text: "text-slate-500", icon: <Medal className="h-7 w-7" /> };
  if (r === 3) return { ring: "ring-orange-400", bg: "from-orange-300/30 to-orange-500/20", text: "text-orange-600", icon: <Medal className="h-7 w-7" /> };
  return { ring: "ring-border", bg: "from-muted/30 to-muted/10", text: "text-foreground", icon: <Award className="h-6 w-6 text-muted-foreground" /> };
};

interface Props {
  programSlug: string;
  programTitle?: string;
}

const HonorListSection = ({ programSlug, programTitle }: Props) => {
  const [semesterId, setSemesterId] = useState<string>("all");

  const { data: snapshots = [] } = useQuery({
    queryKey: ["program-honor-snapshots"],
    queryFn: async () => {
      const { data } = await supabase
        .from("deans_list_snapshots")
        .select("id, semester_id, program, list_title, generated_at, academic_semesters:semester_id(name, start_date)")
        .eq("is_published", true)
        .order("generated_at", { ascending: false });
      return data || [];
    },
  });

  const semesters = useMemo(() => {
    const map = new Map<string, string>();
    snapshots.forEach((s: any) => {
      if (s.academic_semesters?.name) map.set(s.semester_id, s.academic_semesters.name);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [snapshots]);

  const filteredSnapshots = useMemo(() => snapshots
    .filter((s: any) => semesterId === "all" || s.semester_id === semesterId)
    .filter((s: any) => !s.program || s.program === programSlug), [snapshots, semesterId, programSlug]);
  const snapshotIds = filteredSnapshots.map((s: any) => s.id);

  const sectionTitle = (filteredSnapshots[0] as any)?.list_title || "President's Honor List";

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["program-honor-entries", programSlug, snapshotIds.join(",")],
    enabled: snapshotIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("deans_list_entries")
        .select("id, snapshot_id, rank, full_name, program, gpa_albanian, gpa_4")
        .in("snapshot_id", snapshotIds)
        .order("rank");
      return (data || []).filter((e: any) => e.program === programSlug);
    },
  });

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <section className="section-padding bg-gradient-to-b from-background to-muted/20">
      <div className="container">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-amber-100 text-amber-600 mb-4">
            <Trophy className="h-7 w-7" />
          </div>
          <h2 className="heading-lg text-foreground">🏆 {sectionTitle}</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Recognizing the top-performing students in {programTitle || "this program"} for outstanding academic achievement.
          </p>
          <div className="mt-4 h-1 w-16 rounded-full bg-amber-500 mx-auto" />
        </div>

        {semesters.length > 1 && (
          <div className="flex justify-center mb-8">
            <div className="min-w-[240px]">
              <Select value={semesterId} onValueChange={setSemesterId}>
                <SelectTrigger><SelectValue placeholder="Academic year" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All academic years</SelectItem>
                  {semesters.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-center text-muted-foreground py-12">Loading…</p>
        ) : entries.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            No honorees published for this program yet.
          </CardContent></Card>
        ) : (
          <>
            {top3.length > 0 && (
              <div className="grid gap-6 md:grid-cols-3 mb-8">
                {top3.map((e: any) => {
                  const a = rankAccent(e.rank);
                  return (
                    <motion.div key={e.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: e.rank * 0.05 }}>
                      <Card className={`relative overflow-hidden ring-2 ${a.ring}`}>
                        <div className={`absolute inset-0 bg-gradient-to-br ${a.bg} opacity-60 pointer-events-none`} />
                        <CardContent className="relative pt-8 pb-6 text-center">
                          <div className={`inline-flex items-center justify-center h-14 w-14 rounded-full bg-card shadow-sm mb-3 ${a.text}`}>
                            {a.icon}
                          </div>
                          <div className={`text-5xl font-bold ${a.text}`}>#{e.rank}</div>
                          <div className="mt-3 text-lg font-semibold">{e.full_name}</div>
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
                          <th className="text-right px-4 py-3">GPA (10)</th>
                          <th className="text-right px-4 py-3">GPA (4.0)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rest.map((e: any) => (
                          <tr key={e.id} className="border-t border-border hover:bg-muted/30">
                            <td className="px-4 py-3 font-semibold">#{e.rank}</td>
                            <td className="px-4 py-3">{e.full_name}</td>
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
      </div>
    </section>
  );
};

export default HonorListSection;
