import StudentLayout from "@/components/StudentLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FileText, Upload, Mail, Clock, Megaphone, BookOpen, GraduationCap, Building2, Calendar, User, Award, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const StudentDashboard = () => {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["student-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fetch program details based on profile.program
  const { data: programInfo } = useQuery({
    queryKey: ["student-program-info", profile?.program],
    queryFn: async () => {
      const { data } = await supabase
        .from("programs")
        .select("*")
        .eq("slug", profile!.program!)
        .maybeSingle();
      return data;
    },
    enabled: !!profile?.program,
  });

  // Fetch academic advisor for this program
  const { data: advisor } = useQuery({
    queryKey: ["student-advisor", profile?.program],
    queryFn: async () => {
      const { data: pa } = await supabase
        .from("program_advisors")
        .select("advisor_id")
        .eq("program", profile!.program!)
        .maybeSingle();
      if (!pa) return null;
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, user_id")
        .eq("user_id", pa.advisor_id)
        .maybeSingle();
      return prof;
    },
    enabled: !!profile?.program,
  });

  const { data: appCount = 0 } = useQuery({
    queryKey: ["student-app-count", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("id");
      if (error) {
        console.error("Error fetching application count:", error);
        return 0;
      }
      return data?.length ?? 0;
    },
    enabled: !!user,
  });

  const { data: enrolledCount = 0 } = useQuery({
    queryKey: ["student-enrolled-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("user_id", user!.id);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: pendingRequestCount = 0 } = useQuery({
    queryKey: ["student-pending-requests-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("enrollment_requests").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("status", "pending");
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: docCount = 0 } = useQuery({
    queryKey: ["student-doc-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("student_documents").select("*", { count: "exact", head: true }).eq("user_id", user!.id);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["student-unread-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("student_messages").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("is_read", false);
      return count ?? 0;
    },
    enabled: !!user,
  });

  // Fetch GPA data
  const { data: gpaData } = useQuery({
    queryKey: ["student-gpa", user?.id],
    queryFn: async () => {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("id, course_id")
        .eq("user_id", user!.id);
      if (!enrollments?.length) return { gpa: null, gradedCourses: 0 };

      const enrollmentIds = enrollments.map((e) => e.id);
      const courseIds = [...new Set(enrollments.map((e) => e.course_id))];

      const [{ data: components }, { data: grades }, { data: courses }] = await Promise.all([
        supabase.from("grade_components").select("*").in("course_id", courseIds),
        supabase.from("grades").select("*").in("enrollment_id", enrollmentIds),
        supabase.from("courses").select("id, ects").in("id", courseIds),
      ]);

      if (!grades?.length || !components?.length) return { gpa: null, gradedCourses: 0 };

      const ectsMap = Object.fromEntries((courses || []).map((c) => [c.id, c.ects]));
      const compsByCourse: Record<string, typeof components> = {};
      for (const comp of components) {
        (compsByCourse[comp.course_id] ??= []).push(comp);
      }

      let totalWeightedGpa = 0;
      let totalEcts = 0;
      let gradedCourses = 0;

      for (const enrollment of enrollments) {
        const courseComps = compsByCourse[enrollment.course_id];
        if (!courseComps?.length) continue;
        const courseGrades = grades.filter((g) => g.enrollment_id === enrollment.id);
        if (!courseGrades.length) continue;

        let coursePercent = 0;
        let totalWeight = 0;
        for (const comp of courseComps) {
          const compGrades = courseGrades.filter((g) => g.grade_component_id === comp.id);
          if (!compGrades.length) continue;
          const avg = compGrades.reduce((sum, g) => sum + ((g.score ?? 0) / g.max_score) * 100, 0) / compGrades.length;
          coursePercent += avg * Number(comp.weight) / 100;
          totalWeight += Number(comp.weight);
        }
        if (totalWeight === 0) continue;
        const normalized = (coursePercent / totalWeight) * 100;
        const courseGpa = Math.min(4.0, (normalized / 100) * 4.0);
        const ects = ectsMap[enrollment.course_id] ?? 6;
        totalWeightedGpa += courseGpa * ects;
        totalEcts += ects;
        gradedCourses++;
      }

      if (totalEcts === 0) return { gpa: null, gradedCourses: 0 };
      return { gpa: Math.round((totalWeightedGpa / totalEcts) * 100) / 100, gradedCourses };
    },
    enabled: !!user,
  });

  // Fetch announcements relevant to student: general, their enrolled courses, or their program
  const { data: announcements = [] } = useQuery({
    queryKey: ["student-announcements", user?.id],
    queryFn: async () => {
      // Get student's enrolled course IDs
      const { data: enrollments } = await supabase.from("enrollments").select("course_id").eq("user_id", user!.id);
      const courseIds = (enrollments || []).map((e) => e.course_id);

      // Fetch all announcements, then filter client-side for relevance
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;

      return (data || []).filter((a: any) => {
        // General announcements (no course, no program)
        if (!a.course_id && !a.program) return true;
        // Course-specific: student must be enrolled
        if (a.course_id && courseIds.includes(a.course_id)) return true;
        // Program-specific: show all (student may not have a program field yet)
        if (a.program && !a.course_id) return true;
        return false;
      });
    },
    enabled: !!user,
  });

  const cards = [
    { label: "Enrolled Courses", value: enrolledCount, icon: BookOpen, color: "text-primary" },
    { label: "Pending Requests", value: pendingRequestCount, icon: Clock, color: "text-amber-600" },
    { label: "Applications", value: appCount, icon: FileText, color: "text-primary" },
    { label: "Documents", value: docCount, icon: Upload, color: "text-accent" },
    { label: "Unread Messages", value: unreadCount, icon: Mail, color: "text-destructive" },
  ];

  const degreeType = programInfo?.degree || "—";
  const enrollmentDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  const academicItems = [
    { label: "Study Program", value: profile?.program || "Not assigned", icon: GraduationCap },
    { label: "Faculty", value: programInfo?.faculty || "—", icon: Building2 },
    { label: "Program Type", value: degreeType, icon: Award },
    { label: "Duration", value: programInfo?.duration || "—", icon: Clock },
    { label: "Enrollment Date", value: enrollmentDate, icon: Calendar },
  ];

  return (
    <StudentLayout>
      <h1 className="font-display text-2xl font-bold text-foreground">
        Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}!
      </h1>
      <p className="mt-1 text-muted-foreground">Your student portal overview</p>

      <div className="mt-8 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-6">
            <c.icon className={`mb-2 h-6 w-6 ${c.color}`} />
            <p className="font-display text-3xl font-bold text-foreground">{c.value}</p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
          </div>
        ))}
        {/* GPA Card */}
        <div className="rounded-xl border border-border bg-card p-6">
          <TrendingUp className="mb-2 h-6 w-6 text-primary" />
          <p className="font-display text-3xl font-bold text-foreground">
            {gpaData?.gpa != null ? gpaData.gpa.toFixed(2) : "—"}
          </p>
          <p className="text-sm text-muted-foreground">
            GPA {gpaData?.gradedCourses ? `(${gpaData.gradedCourses} courses)` : "/ 4.00"}
          </p>
        </div>
      </div>

      {/* Academic Information */}
      <div className="mt-8">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
          <GraduationCap className="h-5 w-5 text-primary" /> Academic Information
        </h2>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {academicItems.map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                  <p className="mt-0.5 text-sm font-medium text-foreground truncate">{item.value}</p>
                </div>
              </div>
            ))}

            {/* Status */}
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Award className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Status</p>
                <Badge className="mt-1 bg-emerald-500/15 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/20 dark:text-emerald-400">
                  Ongoing
                </Badge>
              </div>
            </div>

            {/* Academic Advisor */}
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Academic Advisor</p>
                {advisor ? (
                  <Link
                    to={`/faculty`}
                    className="mt-0.5 inline-block text-sm font-medium text-primary hover:underline"
                  >
                    {advisor.full_name}
                  </Link>
                ) : (
                  <p className="mt-0.5 text-sm text-muted-foreground">Not assigned</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Announcements */}
      <div className="mt-8">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
          <Megaphone className="h-5 w-5 text-primary" /> Announcements
        </h2>
        {announcements.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No announcements at this time.
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((a: any) => (
              <div key={a.id} className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-display font-semibold text-foreground">{a.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">{a.body}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>By {a.author_name}</span>
                  <span>·</span>
                  <span>{new Date(a.created_at).toLocaleString()}</span>
                  {a.program && <><span>·</span><span>{a.program}</span></>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-5 w-5" />
          <span className="text-sm">Quick tip: Upload your required documents and track your application status from the sidebar.</span>
        </div>
      </div>
    </StudentLayout>
  );
};

export default StudentDashboard;
