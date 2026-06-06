import StudentLayout from "@/components/StudentLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Armchair } from "lucide-react";

type Row = {
  chart: { id: string; rows: number; cols: number; label: string; course_id: string };
  course: { name: string; code: string };
  seat: { row_index: number; col_index: number } | null;
};

const StudentSeating = () => {
  const { user } = useAuth();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["my-seating", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: enr } = await supabase.from("enrollments").select("course_id").eq("user_id", user!.id);
      const courseIds = (enr || []).map((e) => e.course_id);
      if (!courseIds.length) return [];
      const { data: charts } = await supabase
        .from("seating_charts").select("*").in("course_id", courseIds);
      if (!charts?.length) return [];
      const { data: courses } = await supabase
        .from("courses").select("id, name, code").in("id", courseIds);
      const { data: mySeats } = await supabase
        .from("seat_assignments").select("*")
        .in("chart_id", charts.map((c) => c.id))
        .eq("user_id", user!.id);
      const { data: allSeats } = await supabase
        .from("seat_assignments").select("*")
        .in("chart_id", charts.map((c) => c.id));
      return charts.map((ch) => ({
        chart: ch,
        course: courses?.find((c) => c.id === ch.course_id) || { name: "", code: "" },
        seat: mySeats?.find((s) => s.chart_id === ch.id) || null,
        allSeats: (allSeats || []).filter((s) => s.chart_id === ch.id),
      })) as any[];
    },
  });

  return (
    <StudentLayout>
      <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
        <Armchair className="h-6 w-6" /> My Seating
      </h1>
      <p className="text-sm text-muted-foreground">Where you sit in each of your classes</p>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading...</p>
      ) : rows.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          No seating charts have been set up for your courses yet.
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {rows.map((r: any) => {
            const taken = new Set(r.allSeats.map((s: any) => `${s.row_index}-${s.col_index}`));
            return (
              <div key={r.chart.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{r.course.code} — {r.course.name}</h3>
                    <p className="text-xs text-muted-foreground">{r.chart.label}</p>
                  </div>
                  {r.seat ? (
                    <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                      Your seat: Row {r.seat.row_index + 1}, Column {r.seat.col_index + 1}
                    </span>
                  ) : (
                    <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">
                      Not assigned yet
                    </span>
                  )}
                </div>
                <div className="mx-auto mb-3 w-full max-w-md text-center text-[11px] uppercase tracking-wider text-muted-foreground border-b-2 border-primary/40 pb-2">
                  Front / Board
                </div>
                <div
                  className="grid gap-1.5 mx-auto"
                  style={{ gridTemplateColumns: `repeat(${r.chart.cols}, minmax(28px, 1fr))`, maxWidth: r.chart.cols * 44 }}
                >
                  {Array.from({ length: r.chart.rows }).map((_, ri) =>
                    Array.from({ length: r.chart.cols }).map((_, ci) => {
                      const isMine = r.seat?.row_index === ri && r.seat?.col_index === ci;
                      const isTaken = taken.has(`${ri}-${ci}`);
                      return (
                        <div
                          key={`${ri}-${ci}`}
                          className={`aspect-square rounded-md border text-[9px] flex items-center justify-center ${
                            isMine
                              ? "bg-primary border-primary text-primary-foreground font-bold"
                              : isTaken
                              ? "bg-muted border-border text-muted-foreground"
                              : "border-dashed border-border/60 text-muted-foreground/40"
                          }`}
                        >
                          {isMine ? "YOU" : ""}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </StudentLayout>
  );
};

export default StudentSeating;
