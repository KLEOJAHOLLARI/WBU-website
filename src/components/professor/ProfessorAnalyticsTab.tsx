import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import {
  TrendingUp, Award, AlertTriangle, Users, Target, CheckCircle2, XCircle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AnalyticsTabProps {
  enrollments: Array<{ id: string; user_id: string; profiles?: { full_name: string; email: string } }>;
  components: Array<{ id: string; name: string; weight: number; count: number; course_id: string }>;
  grades: Array<{ id: string; enrollment_id: string; grade_component_id: string; instance_number: number; score: number | null; max_score: number }>;
  sessions: Array<{ id: string; session_date: string; week_number: number; course_id: string }>;
  attendanceRecords: Array<{ id: string; session_id: string; enrollment_id: string; status: string }>;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(262, 83%, 58%)",
  "hsl(199, 89%, 48%)",
];

const ProfessorAnalyticsTab = ({ enrollments, components, grades, sessions, attendanceRecords }: AnalyticsTabProps) => {
  // Compute per-student total percentage
  const studentScores = useMemo(() => {
    return enrollments.map((enr) => {
      let total = 0;
      let hasGrades = false;
      const sg = grades.filter((g) => g.enrollment_id === enr.id);
      components.forEach((c) => {
        for (let i = 1; i <= c.count; i++) {
          const g = sg.find((gr) => gr.grade_component_id === c.id && gr.instance_number === i);
          if (g && g.score !== null) {
            total += (Number(g.score) / Number(g.max_score)) * Number(c.weight);
            hasGrades = true;
          }
        }
      });
      return { name: enr.profiles?.full_name || "Unknown", score: hasGrades ? Math.round(total) : null, enrollmentId: enr.id };
    });
  }, [enrollments, components, grades]);

  // Grade distribution buckets
  const gradeDistribution = useMemo(() => {
    const buckets = [
      { range: "90-100%", min: 90, max: 100, count: 0, label: "A" },
      { range: "80-89%", min: 80, max: 89, count: 0, label: "B" },
      { range: "70-79%", min: 70, max: 79, count: 0, label: "C" },
      { range: "60-69%", min: 60, max: 69, count: 0, label: "D" },
      { range: "50-59%", min: 50, max: 59, count: 0, label: "E" },
      { range: "0-49%", min: 0, max: 49, count: 0, label: "F" },
    ];
    studentScores.forEach((s) => {
      if (s.score === null) return;
      const bucket = buckets.find((b) => s.score! >= b.min && s.score! <= b.max);
      if (bucket) bucket.count++;
    });
    return buckets;
  }, [studentScores]);

  // Pass/fail
  const passFailData = useMemo(() => {
    const graded = studentScores.filter((s) => s.score !== null);
    const passing = graded.filter((s) => s.score! >= 50).length;
    const failing = graded.filter((s) => s.score! < 50).length;
    const ungraded = studentScores.filter((s) => s.score === null).length;
    return { passing, failing, ungraded, total: studentScores.length };
  }, [studentScores]);

  const pieData = useMemo(() => [
    { name: "Passing", value: passFailData.passing },
    { name: "Failing", value: passFailData.failing },
    { name: "Ungraded", value: passFailData.ungraded },
  ].filter((d) => d.value > 0), [passFailData]);

  const PIE_COLORS = ["hsl(142, 71%, 45%)", "hsl(0, 84%, 60%)", "hsl(var(--muted-foreground))"];

  // Attendance trend by week
  const attendanceTrend = useMemo(() => {
    if (!sessions.length) return [];
    const weekMap = new Map<number, { total: number; present: number }>();
    sessions.forEach((s) => {
      if (!weekMap.has(s.week_number)) weekMap.set(s.week_number, { total: 0, present: 0 });
    });
    // For each session, count how many students were present
    sessions.forEach((s) => {
      const w = weekMap.get(s.week_number)!;
      enrollments.forEach((enr) => {
        w.total++;
        const rec = attendanceRecords.find((r) => r.session_id === s.id && r.enrollment_id === enr.id);
        if (rec?.status === "present") w.present++;
      });
    });
    return Array.from(weekMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([week, data]) => ({
        week: `W${week}`,
        rate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
      }));
  }, [sessions, enrollments, attendanceRecords]);

  // Per-component average
  const componentAverages = useMemo(() => {
    return components.map((comp) => {
      let totalPct = 0;
      let count = 0;
      enrollments.forEach((enr) => {
        for (let i = 1; i <= comp.count; i++) {
          const g = grades.find(
            (gr) => gr.enrollment_id === enr.id && gr.grade_component_id === comp.id && gr.instance_number === i
          );
          if (g && g.score !== null) {
            totalPct += (Number(g.score) / Number(g.max_score)) * 100;
            count++;
          }
        }
      });
      return { name: comp.name, avg: count > 0 ? Math.round(totalPct / count) : 0, weight: Number(comp.weight) };
    });
  }, [components, grades, enrollments]);

  // Overall stats
  const gradedStudents = studentScores.filter((s) => s.score !== null);
  const classAvg = gradedStudents.length > 0
    ? Math.round(gradedStudents.reduce((s, v) => s + v.score!, 0) / gradedStudents.length)
    : 0;
  const highestScore = gradedStudents.length > 0 ? Math.max(...gradedStudents.map((s) => s.score!)) : 0;
  const lowestScore = gradedStudents.length > 0 ? Math.min(...gradedStudents.map((s) => s.score!)) : 0;
  const overallAttRate = useMemo(() => {
    if (!sessions.length || !enrollments.length) return 0;
    const totalSlots = sessions.length * enrollments.length;
    const present = attendanceRecords.filter((r) => r.status === "present").length;
    return Math.round((present / totalSlots) * 100);
  }, [sessions, enrollments, attendanceRecords]);

  // Top / bottom students
  const topStudents = useMemo(() =>
    [...gradedStudents].sort((a, b) => b.score! - a.score!).slice(0, 5),
    [gradedStudents]
  );
  const bottomStudents = useMemo(() =>
    [...gradedStudents].sort((a, b) => a.score! - b.score!).slice(0, 5),
    [gradedStudents]
  );

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <Users className="mb-1 h-4 w-4 text-primary" />
          <p className="text-2xl font-bold text-foreground">{enrollments.length}</p>
          <p className="text-xs text-muted-foreground">Total Students</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <TrendingUp className="mb-1 h-4 w-4 text-primary" />
          <p className="text-2xl font-bold text-foreground">{classAvg > 0 ? `${classAvg}%` : "—"}</p>
          <p className="text-xs text-muted-foreground">Class Average</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <Award className="mb-1 h-4 w-4 text-emerald-600" />
          <p className="text-2xl font-bold text-emerald-600">{highestScore > 0 ? `${highestScore}%` : "—"}</p>
          <p className="text-xs text-muted-foreground">Highest Score</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <AlertTriangle className="mb-1 h-4 w-4 text-destructive" />
          <p className="text-2xl font-bold text-destructive">{lowestScore > 0 ? `${lowestScore}%` : "—"}</p>
          <p className="text-xs text-muted-foreground">Lowest Score</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <CheckCircle2 className="mb-1 h-4 w-4 text-emerald-600" />
          <p className="text-2xl font-bold text-emerald-600">{passFailData.passing}</p>
          <p className="text-xs text-muted-foreground">Passing</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <Target className="mb-1 h-4 w-4 text-primary" />
          <p className="text-2xl font-bold text-foreground">{overallAttRate > 0 ? `${overallAttRate}%` : "—"}</p>
          <p className="text-xs text-muted-foreground">Attendance Rate</p>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Grade Distribution */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 font-display text-sm font-semibold text-foreground">Grade Distribution</h3>
          {gradedStudents.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No grades recorded yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={gradeDistribution} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                  {gradeDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pass/Fail Pie */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 font-display text-sm font-semibold text-foreground">Pass / Fail Ratio</h3>
          {pieData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No data available</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                    <span className="text-sm text-foreground">{d.name}: <strong>{d.value}</strong></span>
                  </div>
                ))}
                <p className="mt-2 text-xs text-muted-foreground">
                  Pass rate: {passFailData.passing + passFailData.failing > 0
                    ? `${Math.round((passFailData.passing / (passFailData.passing + passFailData.failing)) * 100)}%`
                    : "—"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Attendance Trend */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 font-display text-sm font-semibold text-foreground">Attendance Trend by Week</h3>
          {attendanceTrend.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No attendance sessions recorded</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(val: number) => [`${val}%`, "Attendance"]}
                />
                <Line type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                {/* 75% threshold line */}
                <Line type="monotone" dataKey={() => 75} stroke="hsl(0, 84%, 60%)" strokeDasharray="5 5" strokeWidth={1} dot={false} name="Threshold" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Component Averages */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 font-display text-sm font-semibold text-foreground">Average by Component</h3>
          {componentAverages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No evaluation components defined</p>
          ) : (
            <div className="space-y-3">
              {componentAverages.map((comp) => (
                <div key={comp.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-foreground font-medium">{comp.name}</span>
                    <span className="text-muted-foreground">{comp.avg}% <span className="text-xs">(weight: {comp.weight}%)</span></span>
                  </div>
                  <Progress value={comp.avg} className="h-2" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top / Bottom students */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-foreground">
            <Award className="h-4 w-4 text-emerald-600" /> Top Performers
          </h3>
          {topStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No graded students</p>
          ) : (
            <div className="space-y-2">
              {topStudents.map((s, i) => (
                <div key={s.enrollmentId} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-700">
                      {i + 1}
                    </span>
                    <span className="text-sm text-foreground">{s.name}</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">{s.score}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-foreground">
            <XCircle className="h-4 w-4 text-destructive" /> Needs Improvement
          </h3>
          {bottomStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No graded students</p>
          ) : (
            <div className="space-y-2">
              {bottomStudents.map((s, i) => (
                <div key={s.enrollmentId} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      s.score! < 50 ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-700"
                    }`}>
                      {i + 1}
                    </span>
                    <span className="text-sm text-foreground">{s.name}</span>
                  </div>
                  <span className={`text-sm font-bold ${s.score! < 50 ? "text-destructive" : "text-amber-600"}`}>{s.score}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfessorAnalyticsTab;
