import { useState, useMemo } from "react";
import StudentLayout from "@/components/StudentLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useActiveSemester } from "@/hooks/useActiveSemester";
import SemesterBadge from "@/components/SemesterBadge";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  BookOpen,
  Search,
  Lock,
  GraduationCap,
  Inbox,
} from "lucide-react";

type CourseRow = {
  id: string;
  code: string;
  name: string;
  ects: number;
  professor_id: string | null;
  year: number;
  semester: number;
  is_shared: boolean;
};

const StudentRegistration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: activeSemester } = useActiveSemester();

  const [cart, setCart] = useState<CourseRow[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Profile (program / year / semester)
  const { data: profile } = useQuery({
    queryKey: ["reg-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("program, current_year, current_semester, full_name, student_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const studentYear = activeSemester?.year ?? profile?.current_year ?? 1;
  const studentSemester = activeSemester?.semester ?? profile?.current_semester ?? 1;
  const registrationOpen = !!activeSemester?.enrollment_open;
  const enrollmentDeadline = activeSemester?.enrollment_deadline
    ? new Date(activeSemester.enrollment_deadline)
    : null;

  // Existing enrollments (already approved)
  const { data: enrollments = [] } = useQuery({
    queryKey: ["reg-enrollments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Existing requests
  const { data: requests = [] } = useQuery({
    queryKey: ["reg-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollment_requests")
        .select("*, courses(id, code, name, ects, professor_id, year, semester, is_shared)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!user,
  });

  // Available program courses (own + shared)
  const { data: programCourses = [] } = useQuery({
    queryKey: ["reg-program-courses", profile?.program],
    queryFn: async () => {
      const { data: own, error: e1 } = await supabase
        .from("courses")
        .select("id, code, name, ects, professor_id, year, semester, is_shared")
        .eq("program", profile!.program!);
      if (e1) throw e1;

      const { data: links, error: e2 } = await supabase
        .from("course_shared_programs")
        .select("course_id")
        .eq("program_slug", profile!.program!);
      if (e2) throw e2;

      let shared: CourseRow[] = [];
      const sharedIds = (links || []).map((l) => l.course_id);
      if (sharedIds.length) {
        const { data, error: e3 } = await supabase
          .from("courses")
          .select("id, code, name, ects, professor_id, year, semester, is_shared")
          .in("id", sharedIds);
        if (e3) throw e3;
        shared = (data as CourseRow[]) || [];
      }
      const map = new Map<string, CourseRow>();
      ((own as CourseRow[]) || []).forEach((c) => map.set(c.id, c));
      shared.forEach((c) => map.set(c.id, c));
      return Array.from(map.values()).sort(
        (a, b) => a.year - b.year || a.semester - b.semester || a.name.localeCompare(b.name),
      );
    },
    enabled: !!profile?.program,
  });

  // Professor names
  const profIds = useMemo(() => {
    const set = new Set<string>();
    programCourses.forEach((c) => c.professor_id && set.add(c.professor_id));
    return Array.from(set);
  }, [programCourses]);

  const { data: professors = [] } = useQuery({
    queryKey: ["reg-professors", profIds],
    queryFn: async () => {
      if (!profIds.length) return [];
      const [a, b] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name").in("user_id", profIds),
        supabase.from("professors").select("id, name").in("id", profIds),
      ]);
      const m = new Map<string, string>();
      (b.data || []).forEach((p: any) => p.name && m.set(p.id, p.name));
      (a.data || []).forEach((p: any) => p.full_name && m.set(p.user_id, p.full_name));
      return Array.from(m.entries()).map(([id, name]) => ({ id, name }));
    },
    enabled: profIds.length > 0,
  });
  const profName = (id: string | null) =>
    id ? professors.find((p) => p.id === id)?.name || "—" : "—";

  // Derived sets
  const enrolledIds = new Set(enrollments.map((e: any) => e.course_id));
  const requestedIds = new Set(requests.map((r: any) => r.course_id));
  const pendingRequests = requests.filter((r: any) => r.status === "pending");
  const lastRejected = requests.find((r: any) => r.status === "rejected");
  const lastAccepted = requests.find((r: any) => r.status === "accepted");
  const hasPending = pendingRequests.length > 0;

  // Available to add: program courses, current year/sem reachable, not enrolled, not requested, not in cart
  const cartIds = new Set(cart.map((c) => c.id));
  const availableCourses = programCourses.filter((c) => {
    if (c.year > studentYear) return false;
    if (c.year === studentYear && c.semester > studentSemester) return false;
    if (enrolledIds.has(c.id)) return false;
    if (requestedIds.has(c.id)) return false;
    if (cartIds.has(c.id)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !c.name.toLowerCase().includes(q) &&
        !c.code.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const totalEcts = cart.reduce((s, c) => s + (c.ects || 0), 0);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!registrationOpen) throw new Error("Registration is currently closed");
      if (!cart.length) throw new Error("Cart is empty");
      const rows = cart.map((c) => ({ user_id: user!.id, course_id: c.id }));
      const { error } = await supabase.from("enrollment_requests").insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Sent to your Academic Advisor",
        description: `${cart.length} course${cart.length > 1 ? "s" : ""} submitted for approval.`,
      });
      setCart([]);
      qc.invalidateQueries({ queryKey: ["reg-requests"] });
      qc.invalidateQueries({ queryKey: ["student-enrollment-requests"] });
    },
    onError: (e: any) =>
      toast({ title: "Submission failed", description: e.message, variant: "destructive" }),
  });

  const addToCart = (c: CourseRow) => {
    setCart((p) => (p.find((x) => x.id === c.id) ? p : [...p, c]));
  };
  const removeFromCart = (id: string) =>
    setCart((p) => p.filter((c) => c.id !== id));

  const renderStatusAlert = () => {
    if (!registrationOpen) {
      return (
        <div className="rounded-xl border border-border bg-muted/40 p-4 flex items-start gap-3">
          <Lock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-foreground">
              Course registration is currently closed
            </p>
            <p className="text-sm text-muted-foreground">
              Registration for{" "}
              <span className="font-medium text-foreground">
                {activeSemester?.name ?? "the current semester"}
              </span>{" "}
              has not been opened by the administration yet. You'll be able to build and
              submit your course list as soon as it's approved and opened.
            </p>
          </div>
        </div>
      );
    }
    if (hasPending) {
      return (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-700 dark:text-amber-400">
              Pending approval
            </p>
            <p className="text-sm text-muted-foreground">
              Your registration with {pendingRequests.length} course
              {pendingRequests.length > 1 ? "s" : ""} is awaiting your Academic Advisor's
              decision. You can submit a new registration once it's reviewed.
            </p>
          </div>
        </div>
      );
    }
    if (lastRejected && !lastAccepted) {
      return (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-destructive">Last request rejected</p>
            <p className="text-sm text-muted-foreground">
              Your previous registration was rejected. You can build a new one below.
            </p>
          </div>
        </div>
      );
    }
    if (lastAccepted) {
      return (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-emerald-700 dark:text-emerald-400">
              Last registration approved
            </p>
            <p className="text-sm text-muted-foreground">
              Your previous courses have been added to your dashboard. Add more below.
            </p>
          </div>
        </div>
      );
    }
    if (enrollmentDeadline) {
      return (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-emerald-700 dark:text-emerald-400">
              Registration is open
            </p>
            <p className="text-sm text-muted-foreground">
              Submit your course list before{" "}
              <span className="font-medium text-foreground">
                {enrollmentDeadline.toLocaleDateString()}
              </span>
              .
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <StudentLayout>
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-foreground">Course Registration</h1>
        <p className="text-sm text-muted-foreground">
          Build your list of courses and send it to your Academic Advisor for approval.
        </p>
        <div className="mt-1"><SemesterBadge /></div>
      </div>

      <div className="mt-5 space-y-4">{renderStatusAlert()}</div>

      {/* Cart */}
      <div className="mt-6 rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Selected Courses
            </h2>
            <Badge variant="secondary">{cart.length}</Badge>
            {cart.length > 0 && (
              <Badge className="bg-primary/15 text-primary border-primary/25 hover:bg-primary/15">
                {totalEcts} ECTS
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={hasPending || !registrationOpen}
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {hasPending || !registrationOpen ? <Lock className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              Add Course
            </button>
            <button
              disabled={cart.length === 0 || submitMutation.isPending || hasPending || !registrationOpen}
              onClick={() => submitMutation.mutate()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition-all hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              {submitMutation.isPending ? "Sending..." : "Send to Advisor"}
            </button>
          </div>
        </div>

        {cart.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {!registrationOpen
                ? "Course registration is closed. You'll be able to add courses once an admin opens the registration window."
                : hasPending
                ? "You have a pending registration. Wait for your advisor's decision before adding more."
                : "No courses added yet. Click \"Add Course\" to start building your registration."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Code</th>
                  <th className="px-5 py-3 text-left font-medium">Course Name</th>
                  <th className="px-5 py-3 text-left font-medium">Professor</th>
                  <th className="px-5 py-3 text-left font-medium">ECTS</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {c.code || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-foreground">
                      {c.name}
                      {c.is_shared && (
                        <Badge className="ml-2 bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/15 text-[10px]">
                          Common
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{profName(c.professor_id)}</td>
                    <td className="px-5 py-3">{c.ects}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => removeFromCart(c.id)}
                        className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        aria-label="Remove course"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending request preview */}
      {hasPending && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">
            Current Pending Request
          </h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Code</th>
                  <th className="px-5 py-3 text-left font-medium">Course Name</th>
                  <th className="px-5 py-3 text-left font-medium">ECTS</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((r: any) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {r.courses?.code || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-foreground">
                      {r.courses?.name || "—"}
                    </td>
                    <td className="px-5 py-3">{r.courses?.ects ?? "—"}</td>
                    <td className="px-5 py-3">
                      <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/25 hover:bg-amber-500/15">
                        <Clock className="mr-1 h-3 w-3" /> Pending
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent history */}
      {requests.filter((r: any) => r.status !== "pending").length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">
            Registration History
          </h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                  <th className="px-5 py-3 text-left font-medium">Course</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {requests
                  .filter((r: any) => r.status !== "pending")
                  .map((r: any) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 text-muted-foreground">
                        {new Date(r.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 font-medium text-foreground">
                        {r.courses?.code} · {r.courses?.name}
                      </td>
                      <td className="px-5 py-3">
                        {r.status === "accepted" ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/25 hover:bg-emerald-500/15">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Approved
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="bg-destructive/15 text-destructive border-destructive/25 hover:bg-destructive/15">
                            <XCircle className="mr-1 h-3 w-3" /> Rejected
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!profile?.program && (
        <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
          <GraduationCap className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">No program assigned yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Contact administration to get assigned to a program before registering.
          </p>
        </div>
      )}

      {/* Course picker dialog */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add a course</DialogTitle>
            <DialogDescription>
              Showing courses available for your program up to Year {studentYear}, Semester{" "}
              {studentSemester}. Already enrolled or already requested courses are hidden.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="overflow-y-auto -mx-6 px-6 flex-1 min-h-0">
            {availableCourses.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                No courses match your filters.
              </div>
            ) : (
              <div className="space-y-2">
                {availableCourses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      addToCart(c);
                      setPickerOpen(false);
                      setSearch("");
                    }}
                    className="w-full text-left rounded-lg border border-border bg-card p-3 hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center gap-3"
                  >
                    <div className="rounded-md bg-primary/10 p-2 shrink-0">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-primary">{c.code || "—"}</span>
                        <span className="font-medium text-foreground truncate">{c.name}</span>
                        {c.is_shared && (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/15 text-[10px]">
                            Common
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {profName(c.professor_id)} · Y{c.year}/S{c.semester} · {c.ects} ECTS
                      </p>
                    </div>
                    <Plus className="h-4 w-4 text-primary shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </StudentLayout>
  );
};

export default StudentRegistration;
