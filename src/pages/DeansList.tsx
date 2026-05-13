import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trophy, Award, Medal } from "lucide-react";

const rankAccent = (r: number) => {
  if (r === 1) return { ring: "ring-amber-400", bg: "from-amber-300/30 to-amber-500/20", text: "text-amber-600", icon: <Trophy className="h-7 w-7" /> };
  if (r === 2) return { ring: "ring-slate-300", bg: "from-slate-200/50 to-slate-400/20", text: "text-slate-500", icon: <Medal className="h-7 w-7" /> };
  if (r === 3) return { ring: "ring-orange-400", bg: "from-orange-300/30 to-orange-500/20", text: "text-orange-600", icon: <Medal className="h-7 w-7" /> };
  return { ring: "ring-border", bg: "from-muted/30 to-muted/10", text: "text-foreground", icon: <Award className="h-6 w-6 text-muted-foreground" /> };
};

const DeansList = () => {
  const [semesterId, setSemesterId] = useState<string>("all");
  const [program, setProgram] = useState<string>("all");

  const { data: snapshots = [] } = useQuery({
    queryKey: ["public-deans-snapshots"],
    queryFn: async () => {
      const { data } = await supabase
        .from("deans_list_snapshots")
        .select("id, semester_id, program, generated_at, threshold_gpa, list_title")
        .eq("is_published", true)
        .order("generated_at", { ascending: false });
      return data || [];
    },
  });

  const { data: semesterRows = [] } = useQuery({
    queryKey: ["public-deans-semesters"],
    queryFn: async () => {
      const { data } = await supabase.from("academic_semesters").select("id, name");
      return data || [];
    },
  });

  const semesters = useMemo(() => {
    const map = new Map<string, string>();
    snapshots.forEach((s: any) => {
      const row = semesterRows.find((sem: any) => sem.id === s.semester_id);
      if (row?.name) map.set(s.semester_id, row.name);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [snapshots, semesterRows]);

  const programs = useMemo(() => {
    const set = new Set<string>();
    snapshots.forEach((s: any) => s.program && set.add(s.program));
    return Array.from(set).sort();
  }, [snapshots]);

  const visibleSnapshots = useMemo(() => {
    const latestByProgram = new Map<string, any>();
    snapshots
      .filter((s: any) => (semesterId === "all" || s.semester_id === semesterId))
      .filter((s: any) => (program === "all" ? true : s.program === program || s.program === null))
      .forEach((s: any) => {
        const key = s.program || "all";
        if (!latestByProgram.has(key)) latestByProgram.set(key, s);
      });
    return Array.from(latestByProgram.values());
  }, [snapshots, semesterId, program]);

  const filteredSnapshotIds = useMemo(() => visibleSnapshots.map((s: any) => s.id), [visibleSnapshots]);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["public-deans-entries", filteredSnapshotIds.join(",")],
    enabled: filteredSnapshotIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("deans_list_entries")
        .select("id, snapshot_id, rank, full_name, program, gpa_albanian, gpa_4")
        .in("snapshot_id", filteredSnapshotIds)
        .order("rank");
      return data || [];
    },
  });

  const uniqueEntries = useMemo(() => {
    const seen = new Set<string>();
    return entries.filter((entry: any) => {
      if (program !== "all" && entry.program !== program) return false;
      const key = entry.user_id || entry.full_name;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [entries, program]);

  const top3 = uniqueEntries.slice(0, 3);
  const rest = uniqueEntries.slice(3);

  return (
    <Layout>
      <PageHero
        title="Dean's List"
        subtitle="Celebrating our top-performing students for outstanding academic achievement."
      />

      <section className="container mx-auto px-4 py-12">
        <div className="flex flex-wrap items-end gap-3 mb-8">
          <div className="min-w-[220px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Semester</label>
            <Select value={semesterId} onValueChange={setSemesterId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All semesters</SelectItem>
                {semesters.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[220px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Program</label>
            <Select value={program} onValueChange={setProgram}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All programs</SelectItem>
                {programs.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {snapshots.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">
            <Trophy className="h-10 w-10 mx-auto mb-3 opacity-40" />
            The Dean's List has not been published yet. Please check back soon.
          </CardContent></Card>
        ) : isLoading ? (
          <p className="text-center text-muted-foreground py-12">Loading…</p>
        ) : uniqueEntries.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">
            No published honorees match your filters.
          </CardContent></Card>
        ) : (
          <>
            {top3.length > 0 && (
              <div className="grid gap-6 md:grid-cols-3 mb-10">
                {top3.map((e: any) => {
                  const a = rankAccent(e.rank);
                  return (
                    <motion.div key={e.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: e.rank * 0.05 }}>
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
                          <tr key={e.id} className="border-t border-border hover:bg-muted/30">
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

export default DeansList;
