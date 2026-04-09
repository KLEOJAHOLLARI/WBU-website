import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, FileText, CheckCircle, XCircle, UserCheck, UserX, Clock, Mail, BookOpen } from "lucide-react";

const AdminStudents = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-students"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

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

  const getRoles = (userId: string) => allRoles.filter(r => r.user_id === userId).map(r => r.role);

  // Filter to only show students (role = 'user' or no role)
  const studentProfiles = profiles.filter(p => {
    const roles = getRoles(p.user_id);
    return roles.includes("user") || roles.length === 0;
  });

  const filteredProfiles = statusFilter === "all"
    ? studentProfiles
    : studentProfiles.filter(p => (p as any).account_status === statusFilter);

  const pendingCount = studentProfiles.filter(p => (p as any).account_status === "pending").length;

  const approveAccount = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("profiles").update({ account_status: "approved" } as any).eq("user_id", userId);
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
      const { error } = await supabase.from("profiles").update({ account_status: "rejected" } as any).eq("user_id", userId);
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

      <div className="mt-4 flex gap-2">
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
              <p className="text-muted-foreground text-sm">No students found.</p>
            ) : (
              filteredProfiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedUserId(p.user_id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedUserId === p.user_id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-secondary"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">{p.full_name || "Unnamed"}</p>
                    {getStatusBadge((p as any).account_status || "pending")}
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
            const status = (selectedProfile as any)?.account_status || "pending";
            const pendingEmailVal = (selectedProfile as any)?.pending_email;
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
                          const { error } = await supabase.from("profiles").update({ email: pendingEmailVal, pending_email: null } as any).eq("user_id", selectedUserId);
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
                          const { error } = await supabase.from("profiles").update({ pending_email: null } as any).eq("user_id", selectedUserId);
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
                    value={(selectedProfile as any)?.program || ""}
                    onChange={async (e) => {
                      const val = e.target.value || null;
                      const { error } = await supabase.from("profiles").update({ program: val } as any).eq("user_id", selectedUserId);
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
    </AdminLayout>
  );
};

export default AdminStudents;
