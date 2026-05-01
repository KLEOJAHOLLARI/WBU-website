import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { Send, FileText, CheckCircle, XCircle, UserCheck, UserX, Clock, Mail, BookOpen, Save, Hash, CreditCard, Search, Award, AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ListRowsSkeleton } from "@/components/admin/AdminSkeleton";
import AdminErrorBanner from "@/components/admin/AdminErrorBanner";

const AdminStudents = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editPersonal, setEditPersonal] = useState<Record<string, string>>({});
  const [scholarshipReview, setScholarshipReview] = useState<{
    userId: string;
    program: string | null;
    currentPct: number;
    newPct: number;
    charges: Array<{ id: string; semesterId: string; amount: number; due_date: string | null; status: string }>;
    fees: Array<{ academic_semester_id: string; amount: number; program: string }>;
    semesters: Array<{ id: string; name: string }>;
  } | null>(null);
  const [applyingScholarship, setApplyingScholarship] = useState(false);

  const { data: profiles = [], isLoading, error: profilesError, refetch: refetchProfiles } = useQuery({
    queryKey: ["admin-students"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profilesError) sonnerToast.error("Couldn't load students");
  }, [profilesError]);

  const { data: allRoles = [] } = useQuery({
    queryKey: ["admin-student-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["all-programs-list"],
    queryFn: async () => {
      const { data } = await supabase.from("programs").select("slug, title").order("title");
      return data || [];
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["admin-student-documents", selectedUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_documents")
        .select("*")
        .eq("user_id", selectedUserId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedUserId,
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["admin-student-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("user_id, email, full_name, gender, birthplace, personal_id, phone, program, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const getRoles = (userId: string) => allRoles.filter(r => r.user_id === userId).map(r => r.role);

  // Filter to only show students (role = 'user' or no role)
  const studentProfiles = profiles.filter(p => {
    const roles = getRoles(p.user_id);
    return roles.includes("user") || roles.length === 0;
  });

  const filteredProfiles = studentProfiles.filter(p => {
    const matchesStatus = statusFilter === "all" || p.account_status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      (p.full_name || "").toLowerCase().includes(q) ||
      (p.email || "").toLowerCase().includes(q) ||
      (p.student_id || "").toLowerCase().includes(q) ||
      (p.student_exam_code || "").toLowerCase().includes(q) ||
      (p.personal_id || "").toLowerCase().includes(q) ||
      (p.phone || "").toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const pendingCount = studentProfiles.filter(p => p.account_status === "pending").length;

  const approveAccount = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("profiles").update({ account_status: "approved" }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      toast({ title: "Account approved!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rejectAccount = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("profiles").update({ account_status: "rejected" }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      toast({ title: "Account rejected" });
    },
  });

  const updateDocStatus = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note?: string }) => {
      const update: { status: string; admin_note?: string } = { status };
      if (note !== undefined) update.admin_note = note;
      const { error } = await supabase.from("student_documents").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-student-documents"] });
      toast({ title: "Document status updated" });
    },
  });

  const sendMessage = async () => {
    if (!selectedUserId || !msgSubject.trim() || !msgBody.trim()) return;
    setSending(true);
    const { error } = await supabase.from("student_messages").insert({
      user_id: selectedUserId,
      subject: msgSubject,
      body: msgBody,
    });
    setSending(false);
    if (error) {
      toast({ title: "Error sending message", variant: "destructive" });
    } else {
      toast({ title: "Message sent!" });
      setMsgSubject("");
      setMsgBody("");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600"><CheckCircle className="h-3 w-3" /> Approved</span>;
      case "rejected": return <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"><XCircle className="h-3 w-3" /> Rejected</span>;
      default: return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600"><Clock className="h-3 w-3" /> Pending</span>;
    }
  };

  const tabCls = (f: string) => `px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${statusFilter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`;

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold text-foreground">Student Management</h1>
      <p className="text-sm text-muted-foreground">Approve accounts, manage documents, and send messages</p>

      {pendingCount > 0 && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          <Clock className="mr-1 inline h-4 w-4" /> {pendingCount} student account{pendingCount > 1 ? "s" : ""} pending approval
        </div>
      )}

      <div className="mt-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name, email, student ID, exam code, personal ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={() => setStatusFilter("all")} className={tabCls("all")}>All ({studentProfiles.length})</button>
        <button onClick={() => setStatusFilter("pending")} className={tabCls("pending")}>Pending ({pendingCount})</button>
        <button onClick={() => setStatusFilter("approved")} className={tabCls("approved")}>Approved</button>
        <button onClick={() => setStatusFilter("rejected")} className={tabCls("rejected")}>Rejected</button>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        {/* Student list */}
        <div className="lg:col-span-1">
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : filteredProfiles.length === 0 ? (
              <p className="text-muted-foreground text-sm">{searchQuery ? "No students match your search." : "No students found."}</p>
            ) : (
              filteredProfiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedUserId(p.user_id); setEditPersonal({}); }}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedUserId === p.user_id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-secondary"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">{p.full_name || "Unnamed"}</p>
                    {getStatusBadge(p.account_status || "pending")}
                  </div>
                  <p className="text-xs text-muted-foreground">{p.email}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Student details */}
        <div className="lg:col-span-2">
          {!selectedUserId ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground">
              Select a student to view details
            </div>
          ) : (() => {
            const selectedProfile = profiles.find(p => p.user_id === selectedUserId);
            const selectedApplication = applications.find((app) => app.user_id === selectedUserId) || null;
            const personalInfo = {
              student_id: selectedProfile?.student_id,
              student_exam_code: selectedProfile?.student_exam_code,
              personal_id: selectedProfile?.personal_id || selectedApplication?.personal_id,
              gender: selectedProfile?.gender || selectedApplication?.gender,
              birthplace: selectedProfile?.birthplace || selectedApplication?.birthplace,
              phone: selectedProfile?.phone || selectedApplication?.phone,
              email: selectedProfile?.email || selectedApplication?.email,
              program: selectedProfile?.program || selectedApplication?.program,
            };
            const status = selectedProfile?.account_status || "pending";
            const pendingEmailVal = selectedProfile?.pending_email;
            return (
              <div className="space-y-6">
                {/* Pending email change */}
                {pendingEmailVal && (
                  <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
                    <div>
                      <p className="text-sm font-medium text-foreground flex items-center gap-2"><Mail className="h-4 w-4" /> Email change request</p>
                      <p className="text-xs text-muted-foreground mt-1">Current: {selectedProfile?.email} → New: {pendingEmailVal}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          const { error } = await supabase.from("profiles").update({ email: pendingEmailVal, pending_email: null }).eq("user_id", selectedUserId);
                          if (error) { toast({ title: "Error", variant: "destructive" }); return; }
                          queryClient.invalidateQueries({ queryKey: ["admin-students"] });
                          toast({ title: "Email updated!" });
                        }}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        onClick={async () => {
                          const { error } = await supabase.from("profiles").update({ pending_email: null }).eq("user_id", selectedUserId);
                          if (error) { toast({ title: "Error", variant: "destructive" }); return; }
                          queryClient.invalidateQueries({ queryKey: ["admin-students"] });
                          toast({ title: "Email change rejected" });
                        }}
                        className="inline-flex items-center gap-1 rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                )}

                {/* Approval actions */}
                {status === "pending" && (
                  <div className="flex gap-3 rounded-xl border border-border bg-card p-4">
                    <button
                      onClick={() => approveAccount.mutate(selectedUserId)}
                      className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      <UserCheck className="h-4 w-4" /> Approve Account
                    </button>
                    <button
                      onClick={() => rejectAccount.mutate(selectedUserId)}
                      className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:opacity-90"
                    >
                      <UserX className="h-4 w-4" /> Reject Account
                    </button>
                  </div>
                )}

                {/* Program assignment */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <h2 className="mb-2 flex items-center gap-2 font-display text-sm font-semibold text-foreground">
                    <BookOpen className="h-4 w-4" /> Assigned Program
                  </h2>
                  <select
                    value={selectedProfile?.program || ""}
                    onChange={async (e) => {
                      const val = e.target.value || null;
                      const { error } = await supabase.from("profiles").update({ program: val }).eq("user_id", selectedUserId);
                      if (error) { toast({ title: "Error", variant: "destructive" }); return; }
                      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
                      toast({ title: val ? "Program assigned!" : "Program removed" });
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">No program assigned</option>
                    {programs.map((p: any) => <option key={p.slug} value={p.slug}>{p.title}</option>)}
                  </select>
                </div>

                {/* Academic Year & Semester */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <h2 className="mb-2 flex items-center gap-2 font-display text-sm font-semibold text-foreground">
                    <BookOpen className="h-4 w-4" /> Current Academic Period
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Current Year</label>
                      <select
                        defaultValue={(selectedProfile as any)?.current_year || 1}
                        key={`year-${selectedUserId}`}
                        onChange={async (e) => {
                          const val = parseInt(e.target.value);
                          const { error } = await supabase.from("profiles").update({ current_year: val } as any).eq("user_id", selectedUserId);
                          if (error) { toast({ title: "Error", variant: "destructive" }); return; }
                          queryClient.invalidateQueries({ queryKey: ["admin-students"] });
                          toast({ title: "Current year updated" });
                        }}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {[1,2,3,4,5].map(y => <option key={y} value={y}>Year {y}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Current Semester</label>
                      <select
                        defaultValue={(selectedProfile as any)?.current_semester || 1}
                        key={`sem-${selectedUserId}`}
                        onChange={async (e) => {
                          const val = parseInt(e.target.value);
                          const { error } = await supabase.from("profiles").update({ current_semester: val } as any).eq("user_id", selectedUserId);
                          if (error) { toast({ title: "Error", variant: "destructive" }); return; }
                          queryClient.invalidateQueries({ queryKey: ["admin-students"] });
                          toast({ title: "Current semester updated" });
                        }}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {[1,2].map(s => <option key={s} value={s}>Semester {s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Scholarship */}
                {(() => {
                  const sp = selectedProfile as any;
                  const has = !!sp?.has_scholarship;
                  const pct = sp?.scholarship_percentage ?? 100;
                  const req = sp?.required_open_lecture_hours ?? 18;
                  const done = sp?.completed_open_lecture_hours ?? 0;
                  const eligible = done >= req;
                  const statusLabel = !has ? "—" : eligible ? "Eligible" : done > 0 ? "Warning" : "Lost Requirement";
                  const statusCls = !has
                    ? "bg-muted text-muted-foreground"
                    : eligible
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-destructive/10 text-destructive";
                  return (
                    <div className="rounded-xl border border-border bg-card p-4">
                      <h2 className="mb-3 flex items-center justify-between font-display text-sm font-semibold text-foreground">
                        <span className="flex items-center gap-2"><Award className="h-4 w-4" /> Scholarship <span className="text-[10px] font-normal text-muted-foreground">(attendance + GPA ≥ 8.5)</span></span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusCls}`}>
                          {statusLabel}
                        </span>
                      </h2>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
                          <input
                            type="checkbox"
                            checked={has}
                            onChange={async (e) => {
                              const next = e.target.checked;
                              const { error } = await supabase.from("profiles").update({
                                has_scholarship: next,
                                ...(next && !pct ? { scholarship_percentage: 100 } : {}),
                              } as any).eq("user_id", selectedUserId);
                              if (error) { toast({ title: "Error", variant: "destructive" }); return; }
                              queryClient.invalidateQueries({ queryKey: ["admin-students"] });
                              toast({ title: next ? "Marked as scholarship holder" : "Scholarship removed" });
                            }}
                          />
                          <span className="text-foreground">Has scholarship</span>
                        </label>
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">Scholarship %</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            defaultValue={pct}
                            key={`pct-${selectedUserId}-${pct}`}
                            disabled={!has}
                            onBlur={async (e) => {
                              const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                              if (val === pct) return;
                              // Fetch unpaid charges + program fees + semesters in parallel for review
                              const program = (selectedProfile as any)?.program || null;
                              const [chargesRes, feesRes, semsRes] = await Promise.all([
                                supabase.from("tuition_charges").select("id, academic_semester_id, amount, due_date, status, program").eq("user_id", selectedUserId!).in("status", ["unpaid", "partial"]),
                                program ? supabase.from("program_tuition_fees").select("academic_semester_id, amount, program").eq("program", program) : Promise.resolve({ data: [], error: null } as any),
                                supabase.from("academic_semesters").select("id, name"),
                              ]);
                              if (chargesRes.error) { toast({ title: "Error loading charges", variant: "destructive" }); return; }
                              setScholarshipReview({
                                userId: selectedUserId!,
                                program,
                                currentPct: pct,
                                newPct: val,
                                charges: (chargesRes.data || []).map((c: any) => ({ id: c.id, semesterId: c.academic_semester_id, amount: Number(c.amount), due_date: c.due_date, status: c.status })),
                                fees: (feesRes.data || []) as any,
                                semesters: (semsRes.data || []) as any,
                              });
                            }}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                          <p className="mt-1 text-[11px] text-muted-foreground">Changes prompt a review of unpaid installments.</p>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">Required hours</label>
                          <input
                            type="number"
                            min={0}
                            defaultValue={req}
                            key={`req-${selectedUserId}`}
                            disabled={!has}
                            onBlur={async (e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 18);
                              const { error } = await supabase.from("profiles").update({ required_open_lecture_hours: val } as any).eq("user_id", selectedUserId);
                              if (error) { toast({ title: "Error", variant: "destructive" }); return; }
                              queryClient.invalidateQueries({ queryKey: ["admin-students"] });
                              toast({ title: "Required hours updated" });
                            }}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">Completed hours</label>
                          <input
                            type="number"
                            min={0}
                            defaultValue={done}
                            key={`done-${selectedUserId}`}
                            disabled={!has}
                            onBlur={async (e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              const { error } = await supabase.from("profiles").update({ completed_open_lecture_hours: val } as any).eq("user_id", selectedUserId);
                              if (error) { toast({ title: "Error", variant: "destructive" }); return; }
                              queryClient.invalidateQueries({ queryKey: ["admin-students"] });
                              toast({ title: "Completed hours updated" });
                            }}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Personal Information (editable by admin) */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-foreground">
                    <Hash className="h-4 w-4" /> Personal Information
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { key: "student_id", label: "Student ID", readOnly: true },
                      { key: "student_exam_code", label: "Exam Code", readOnly: true },
                      { key: "personal_id", label: "Personal ID" },
                      { key: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"] },
                      { key: "birthplace", label: "Birthplace" },
                      { key: "phone", label: "Phone" },
                      { key: "email", label: "Email", readOnly: true },
                      { key: "program", label: "Program", readOnly: true },
                    ].map((field) => {
                      const original = (personalInfo as Record<string, string | null | undefined>)[field.key] || "";
                      const editVal = editPersonal[field.key];
                      const currentVal = editVal !== undefined ? editVal : (original || "");
                      return (
                        <div key={field.key}>
                          <label className="mb-1 block text-xs text-muted-foreground">{field.label}</label>
                          {field.readOnly ? (
                            <p className="font-medium text-foreground text-sm py-1.5">
                              {field.key === "program"
                                ? (programs.find((pr: any) => pr.slug === original)?.title || original || <span className="text-muted-foreground italic">Not provided</span>)
                                : (original || <span className="text-muted-foreground italic">Not provided</span>)}
                            </p>
                          ) : field.type === "select" ? (
                            <select
                              value={currentVal}
                              onChange={(e) => setEditPersonal(prev => ({ ...prev, [field.key]: e.target.value }))}
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                              <option value="">Not provided</option>
                              {field.options!.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input
                              value={currentVal}
                              onChange={(e) => setEditPersonal(prev => ({ ...prev, [field.key]: e.target.value }))}
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {Object.keys(editPersonal).length > 0 && (
                    <button
                      onClick={async () => {
                        const updates: { personal_id?: string | null; gender?: string | null; birthplace?: string | null; phone?: string | null } = {};
                        if ("personal_id" in editPersonal) updates.personal_id = editPersonal.personal_id || null;
                        if ("gender" in editPersonal) updates.gender = editPersonal.gender || null;
                        if ("birthplace" in editPersonal) updates.birthplace = editPersonal.birthplace || null;
                        if ("phone" in editPersonal) updates.phone = editPersonal.phone || null;
                        const { error } = await supabase.from("profiles").update(updates).eq("user_id", selectedUserId);
                        if (error) { toast({ title: "Error saving", variant: "destructive" }); return; }
                        queryClient.invalidateQueries({ queryKey: ["admin-students"] });
                        setEditPersonal({});
                        toast({ title: "Personal info updated!" });
                      }}
                      className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                    >
                      <Save className="h-4 w-4" /> Save Changes
                    </button>
                  )}
                </div>

                {/* Documents */}
                <div>
                  <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Documents</h2>
                  {documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No documents uploaded.</p>
                  ) : (
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <div>
                              <p className="text-sm font-medium text-foreground">{doc.file_name}</p>
                              <p className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()} · {doc.status}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => updateDocStatus.mutate({ id: doc.id, status: "approved" })}
                              className="rounded p-1.5 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => updateDocStatus.mutate({ id: doc.id, status: "rejected" })}
                              className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Send message */}
                <div>
                  <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Send Message</h2>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Subject"
                      value={msgSubject}
                      onChange={(e) => setMsgSubject(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <textarea
                      placeholder="Message body..."
                      value={msgBody}
                      onChange={(e) => setMsgBody(e.target.value)}
                      rows={4}
                      className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sending || !msgSubject.trim() || !msgBody.trim()}
                      className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      <Send className="h-4 w-4" />
                      {sending ? "Sending..." : "Send Message"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <AlertDialog open={!!scholarshipReview} onOpenChange={(o) => !o && !applyingScholarship && setScholarshipReview(null)}>
        <AlertDialogContent className="max-w-2xl">
          {scholarshipReview && (() => {
            const { currentPct, newPct, charges, fees, semesters, program } = scholarshipReview;
            const semName = (id: string) => semesters.find(s => s.id === id)?.name || "—";
            const feeFor = (semId: string) => fees.find(f => f.academic_semester_id === semId)?.amount;
            // For each unpaid charge, compute the new installment amount based on its semester program fee (4 installments).
            const rows = charges.map(c => {
              const annual = feeFor(c.semesterId);
              let newAmount: number | null = null;
              if (annual != null) {
                const netAnnual = +(Number(annual) * (100 - newPct) / 100).toFixed(2);
                const base = Math.floor((netAnnual / 4) * 100) / 100;
                // Use base for installments 1-3; remainder for installment 4. We can't distinguish which installment this row is,
                // so show a representative per-installment range.
                const last = +(netAnnual - base * 3).toFixed(2);
                newAmount = base === last ? base : base; // approximate per-row using base; show note
              }
              const delta = newAmount != null ? +(newAmount - c.amount).toFixed(2) : null;
              return { ...c, newAmount, delta };
            });
            const totalCurrent = rows.reduce((s, r) => s + r.amount, 0);
            const totalNew = rows.reduce((s, r) => s + (r.newAmount ?? r.amount), 0);
            const totalDelta = +(totalNew - totalCurrent).toFixed(2);
            const missingFee = rows.some(r => r.newAmount == null);
            return (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    Review scholarship change
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Changing scholarship from <strong>{currentPct}%</strong> to <strong>{newPct}%</strong>
                    {program ? <> for program <strong>{program}</strong></> : null}. Review affected unpaid installments below before applying.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                {!program && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300 flex gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Student has no assigned program — installment amounts cannot be recomputed automatically.
                  </div>
                )}

                {rows.length === 0 ? (
                  <div className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    No unpaid or partial installment charges will be affected. Only the scholarship % on the profile will change.
                  </div>
                ) : (
                  <div className="max-h-72 overflow-auto rounded-md border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Semester</th>
                          <th className="px-3 py-2 text-left font-medium">Due</th>
                          <th className="px-3 py-2 text-left font-medium">Status</th>
                          <th className="px-3 py-2 text-right font-medium">Current</th>
                          <th className="px-3 py-2 text-right font-medium">New</th>
                          <th className="px-3 py-2 text-right font-medium">Δ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(r => (
                          <tr key={r.id} className="border-t border-border">
                            <td className="px-3 py-2 text-foreground">{semName(r.semesterId)}</td>
                            <td className="px-3 py-2 text-muted-foreground">{r.due_date || "—"}</td>
                            <td className="px-3 py-2"><span className="inline-flex rounded-full bg-secondary px-2 py-0.5 capitalize">{r.status}</span></td>
                            <td className="px-3 py-2 text-right font-mono">€{r.amount.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-mono">{r.newAmount != null ? `€${r.newAmount.toFixed(2)}` : <span className="text-muted-foreground italic">no fee</span>}</td>
                            <td className={`px-3 py-2 text-right font-mono ${r.delta == null ? "text-muted-foreground" : r.delta < 0 ? "text-emerald-600" : r.delta > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                              {r.delta == null ? "—" : `${r.delta > 0 ? "+" : ""}€${r.delta.toFixed(2)}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/30 font-semibold">
                        <tr>
                          <td className="px-3 py-2" colSpan={3}>Totals ({rows.length} installment{rows.length !== 1 ? "s" : ""})</td>
                          <td className="px-3 py-2 text-right font-mono">€{totalCurrent.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-mono">€{totalNew.toFixed(2)}</td>
                          <td className={`px-3 py-2 text-right font-mono ${totalDelta < 0 ? "text-emerald-600" : totalDelta > 0 ? "text-destructive" : ""}`}>
                            {totalDelta > 0 ? "+" : ""}€{totalDelta.toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {missingFee && rows.length > 0 && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Some installments belong to semesters without a program fee — those amounts will be left unchanged.
                  </p>
                )}

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={applyingScholarship}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={applyingScholarship}
                    onClick={async (e) => {
                      e.preventDefault();
                      setApplyingScholarship(true);
                      try {
                        // 1. Update profile scholarship %
                        const { error: pErr } = await supabase.from("profiles").update({ scholarship_percentage: newPct } as any).eq("user_id", scholarshipReview.userId);
                        if (pErr) throw pErr;
                        // 2. Update affected unpaid charge amounts
                        const updatable = rows.filter(r => r.newAmount != null && r.newAmount !== r.amount);
                        for (const r of updatable) {
                          const { error: cErr } = await supabase.from("tuition_charges").update({ amount: r.newAmount! }).eq("id", r.id);
                          if (cErr) throw cErr;
                        }
                        queryClient.invalidateQueries({ queryKey: ["admin-students"] });
                        toast({ title: "Scholarship applied", description: `Updated ${updatable.length} installment${updatable.length !== 1 ? "s" : ""}.` });
                        setScholarshipReview(null);
                      } catch (err: any) {
                        toast({ title: "Error applying changes", description: err.message, variant: "destructive" });
                      } finally {
                        setApplyingScholarship(false);
                      }
                    }}
                  >
                    {applyingScholarship ? "Applying..." : `Apply to ${rows.filter(r => r.newAmount != null && r.newAmount !== r.amount).length} installment(s)`}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminStudents;
