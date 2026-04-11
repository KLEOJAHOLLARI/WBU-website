import AdminLayout from "@/components/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

const AdminAnalytics = () => {
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-analytics-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("program, gender, created_at, account_status");
      return data ?? [];
    },
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["admin-analytics-programs"],
    queryFn: async () => {
      const { data } = await supabase.from("programs").select("title, slug");
      return data ?? [];
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["admin-analytics-enrollments"],
    queryFn: async () => {
      const { data } = await supabase.from("enrollments").select("created_at, course_id");
      return data ?? [];
    },
  });

  // Program popularity
  const programCounts: Record<string, number> = {};
  profiles.forEach((p) => {
    if (p.program) programCounts[p.program] = (programCounts[p.program] || 0) + 1;
  });
  const programData = programs.map((pr) => ({
    name: pr.title.length > 20 ? pr.title.slice(0, 20) + "…" : pr.title,
    students: programCounts[pr.slug] || 0,
  })).sort((a, b) => b.students - a.students);

  // Gender distribution
  const genderCounts: Record<string, number> = {};
  profiles.forEach((p) => {
    const g = p.gender || "Not specified";
    genderCounts[g] = (genderCounts[g] || 0) + 1;
  });
  const genderData = Object.entries(genderCounts).map(([name, value]) => ({ name, value }));

  // Account status
  const statusCounts: Record<string, number> = {};
  profiles.forEach((p) => {
    statusCounts[p.account_status] = (statusCounts[p.account_status] || 0) + 1;
  });
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  // Enrollment trends (last 12 months)
  const monthlyEnrollments: Record<string, number> = {};
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyEnrollments[key] = 0;
  }
  enrollments.forEach((e) => {
    const d = new Date(e.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (key in monthlyEnrollments) monthlyEnrollments[key]++;
  });
  const trendData = Object.entries(monthlyEnrollments).map(([month, count]) => ({
    month: month.slice(5),
    enrollments: count,
  }));

  // Monthly registrations
  const monthlyRegs: Record<string, number> = {};
  Object.keys(monthlyEnrollments).forEach((k) => (monthlyRegs[k] = 0));
  profiles.forEach((p) => {
    const d = new Date(p.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (key in monthlyRegs) monthlyRegs[key]++;
  });
  const regData = Object.entries(monthlyRegs).map(([month, count]) => ({
    month: month.slice(5),
    registrations: count,
  }));

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold text-foreground">Analytics</h1>
      <p className="mt-1 text-muted-foreground">Enrollment trends, program popularity, and demographics</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Enrollment Trends */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Enrollment Trends (Last 12 Months)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip />
                <Line type="monotone" dataKey="enrollments" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Program Popularity */}
        <Card>
          <CardHeader><CardTitle className="text-base">Students per Program</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={programData} layout="vertical">
                <XAxis type="number" allowDecimals={false} className="text-xs" />
                <YAxis type="category" dataKey="name" width={130} className="text-xs" />
                <Tooltip />
                <Bar dataKey="students" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gender Distribution */}
        <Card>
          <CardHeader><CardTitle className="text-base">Gender Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {genderData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Registration Trends */}
        <Card>
          <CardHeader><CardTitle className="text-base">New Registrations (Last 12 Months)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={regData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip />
                <Bar dataKey="registrations" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Account Status */}
        <Card>
          <CardHeader><CardTitle className="text-base">Account Status Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;
