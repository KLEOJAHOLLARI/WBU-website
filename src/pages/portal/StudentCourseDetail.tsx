import { useParams } from "react-router-dom";
import StudentLayout from "@/components/StudentLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";

const StudentCourseDetail = () => {
  const { id: courseId } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: course } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", courseId!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: enrollment } = useQuery({
    queryKey: ["enrollment", courseId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("*")
        .eq("course_id", courseId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId && !!user,
  });

  const { data: components = [] } = useQuery({
    queryKey: ["grade-components", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("grade_components").select("*").eq("course_id", courseId!).order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: grades = [] } = useQuery({
    queryKey: ["student-grades", enrollment?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("grades").select("*").eq("enrollment_id", enrollment!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!enrollment,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["attendance-sessions", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("attendance_sessions").select("*").eq("course_id", courseId!).order("session_date");
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ["student-attendance", enrollment?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("attendance_records").select("*").eq("enrollment_id", enrollment!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!enrollment,
  });

  const presentCount = attendanceRecords.filter((r) => r.status === "present").length;
  const attPct = sessions.length > 0 ? Math.round((presentCount / sessions.length) * 100) : null;
  const examBlocked = attPct !== null && attPct < 75;

  // Calculate total grade
  let totalGrade = 0;
  components.forEach((comp) => {
    for (let i = 1; i <= comp.count; i++) {
      const grade = grades.find((g) => g.grade_component_id === comp.id && g.instance_number === i);
      if (grade && grade.score !== null) {
        totalGrade += (Number(grade.score) / Number(grade.max_score)) * Number(comp.weight);
      }
    }
  });

  if (!course) return <StudentLayout><p className="text-muted-foreground">Loading...</p></StudentLayout>;

  return (
    <StudentLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">{course.name}</h1>
        <p className="text-sm text-muted-foreground">{course.code} · {course.program} · Year {course.year} · Sem {course.semester}</p>
        {course.syllabus_url && (
          <a href={course.syllabus_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <ExternalLink className="h-3.5 w-3.5" /> View Syllabus
          </a>
        )}
      </div>

      {/* Attendance Section */}
      <div className="mb-8">
        <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Attendance</h2>
        {examBlocked && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm font-medium text-destructive">Your attendance is below 75%. You are blocked from the final exam.</p>
          </div>
        )}
        <div className="mb-2 flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Overall:</span>
          <span className={`text-lg font-bold ${examBlocked ? "text-destructive" : "text-green-600"}`}>
            {attPct !== null ? `${attPct}%` : "No data"}
          </span>
          <span className="text-xs text-muted-foreground">({presentCount}/{sessions.length} sessions)</span>
        </div>

        {sessions.length > 0 && (
          <div className="overflow-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Week</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Date</th>
                  <th className="px-3 py-2 text-center font-medium text-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const rec = attendanceRecords.find((r) => r.session_id === s.id);
                  const status = rec?.status || "absent";
                  return (
                    <tr key={s.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-muted-foreground">Week {s.week_number}</td>
                      <td className="px-3 py-2 text-foreground">{s.session_date}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          status === "present" ? "bg-green-100 text-green-800" :
                          status === "excused" ? "bg-yellow-100 text-yellow-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {status === "present" ? "Present" : status === "excused" ? "Excused" : "Absent"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grades Section */}
      <div>
        <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Grades</h2>
        {components.length === 0 ? (
          <p className="text-muted-foreground">No evaluation scheme defined yet.</p>
        ) : (
          <>
            <div className="overflow-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-secondary">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Component</th>
                    <th className="px-3 py-2 text-center font-medium text-foreground">Weight</th>
                    <th className="px-3 py-2 text-center font-medium text-foreground">Score</th>
                    <th className="px-3 py-2 text-center font-medium text-foreground">Weighted</th>
                  </tr>
                </thead>
                <tbody>
                  {components.flatMap((comp) =>
                    Array.from({ length: comp.count }, (_, i) => {
                      const grade = grades.find((g) => g.grade_component_id === comp.id && g.instance_number === i + 1);
                      const hasScore = grade && grade.score !== null;
                      const weighted = hasScore ? (Number(grade.score) / Number(grade.max_score)) * Number(comp.weight) : null;
                      return (
                        <tr key={`${comp.id}-${i}`} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 text-foreground">{comp.name}{comp.count > 1 ? ` ${i + 1}` : ""}</td>
                          <td className="px-3 py-2 text-center text-muted-foreground">{Number(comp.weight)}%</td>
                          <td className="px-3 py-2 text-center font-medium text-foreground">
                            {hasScore ? `${grade.score}/${grade.max_score}` : "—"}
                          </td>
                          <td className="px-3 py-2 text-center text-muted-foreground">
                            {weighted !== null ? `${weighted.toFixed(1)}%` : "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-secondary p-3">
              <span className="text-sm font-medium text-foreground">Total Grade:</span>
              <span className="text-lg font-bold text-primary">{Math.round(totalGrade)}%</span>
            </div>
          </>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentCourseDetail;
