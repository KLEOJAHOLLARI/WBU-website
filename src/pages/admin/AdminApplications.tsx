import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Eye, FileText, Trash2, Copy, UserPlus } from "lucide-react";
import { useHighlightParam, highlightClasses } from "@/hooks/useHighlightParam";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const parseDocs = (url: string | null): string[] =>
  url ? url.split(",").map((s) => s.trim()).filter(Boolean) : [];

const AdminApplications = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [viewing, setViewing] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const acceptApplication = async (id: string) => {
    setAccepting(id);
    try {
      const { data, error } = await supabase.functions.invoke("accept-application", {
        body: { application_id: id },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      qc.invalidateQueries({ queryKey: ["admin-applications"] });
      qc.invalidateQueries({ queryKey: ["admin-students"] });

      if (!data.account_existed && data.generated_email && data.generated_password) {
        setCredentials({ email: data.generated_email, password: data.generated_password });
      }

      toast({
        title: "Application accepted",
        description: data.account_existed
          ? "Existing student account has been activated."
          : "New student account created successfully.",
      });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setAccepting(null);
    }
  };

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("applications").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-applications"] });
      toast({ title: `Application ${vars.status}` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteApp = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("applications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-applications"] });
      toast({ title: "Application deleted" });
    },
  });

  const filtered = statusFilter === "all"
    ? applications
    : applications.filter((a) => a.status === statusFilter);

  const { isHighlighted } = useHighlightParam("focus", "app", !isLoading && applications.length > 0, (id) => {
    setViewing(id);
  });

  const pendingCount = applications.filter((a) => a.status === "pending").length;

  const getDocUrl = (path: string) => {
    const { data } = supabase.storage.from("application-documents").getPublicUrl(path);
    return data.publicUrl;
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600"><CheckCircle className="h-3 w-3" />Accepted</span>;
      case "rejected":
        return <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"><XCircle className="h-3 w-3" />Rejected</span>;
      default:
        return <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">Pending</span>;
    }
  };

  const tabCls = (f: string) =>
    `px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${statusFilter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold text-foreground">Applications</h1>
      <p className="text-sm text-muted-foreground">Review, accept or reject student applications</p>

      {/* Credentials Modal */}
      {credentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-2 text-emerald-600">
              <UserPlus className="h-5 w-5" />
              <h2 className="font-display text-lg font-bold">Student Account Created</h2>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              A new student account has been created. Share these credentials with the student. They will be required to change their password on first login.
            </p>
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-secondary p-3">
                <p className="text-xs text-muted-foreground">University Email</p>
                <div className="flex items-center justify-between">
                  <p className="font-mono text-sm font-semibold text-foreground">{credentials.email}</p>
                  <button onClick={() => copyToClipboard(credentials.email)} className="rounded p-1 text-muted-foreground hover:text-foreground"><Copy className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-secondary p-3">
                <p className="text-xs text-muted-foreground">Temporary Password</p>
                <div className="flex items-center justify-between">
                  <p className="font-mono text-sm font-semibold text-foreground">{credentials.password}</p>
                  <button onClick={() => copyToClipboard(credentials.password)} className="rounded p-1 text-muted-foreground hover:text-foreground"><Copy className="h-4 w-4" /></button>
                </div>
              </div>
              <button
                onClick={() => {
                  copyToClipboard(`Email: ${credentials.email}\nPassword: ${credentials.password}`);
                }}
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Copy All Credentials
              </button>
            </div>
            <button
              onClick={() => setCredentials(null)}
              className="mt-4 w-full rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button onClick={() => setStatusFilter("all")} className={tabCls("all")}>All ({applications.length})</button>
        <button onClick={() => setStatusFilter("pending")} className={tabCls("pending")}>Pending ({pendingCount})</button>
        <button onClick={() => setStatusFilter("accepted")} className={tabCls("accepted")}>Accepted</button>
        <button onClick={() => setStatusFilter("rejected")} className={tabCls("rejected")}>Rejected</button>
      </div>

      <div className="mt-4 overflow-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Program</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Document</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Date</th>
              <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No applications found</td></tr>
            ) : filtered.map((a) => (
              <tr key={a.id} id={`app-${a.id}`} className={`border-b border-border last:border-0 ${isHighlighted(a.id) ? highlightClasses : ""}`}>
                <td className="px-4 py-3 font-medium text-foreground">{a.full_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.program}</td>
                <td className="px-4 py-3">
                  {a.document_url ? (
                    <a
                      href={getDocUrl(a.document_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5" /> View PDF
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {statusBadge(a.status)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setViewing(viewing === a.id ? null : a.id)}
                      className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {a.status === "pending" && (
                      <>
                        <button
                          onClick={() => acceptApplication(a.id)}
                          disabled={accepting === a.id}
                          className="rounded p-1.5 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600 disabled:opacity-50"
                          title="Accept & Create Account"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => updateStatus.mutate({ id: a.id, status: "rejected" })}
                          className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Reject"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => { if (confirm("Delete this application?")) deleteApp.mutate(a.id); }}
                      className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail panel */}
      {viewing && (() => {
        const app = applications.find((a) => a.id === viewing);
        if (!app) return null;
        return (
          <div className="mt-6 rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-foreground">Application Details</h2>
              <button onClick={() => setViewing(null)} className="text-muted-foreground hover:text-foreground text-sm">Close</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Full Name</p><p className="font-medium text-foreground">{app.full_name}</p></div>
              <div><p className="text-xs text-muted-foreground">Email</p><p className="text-foreground">{app.email}</p></div>
              <div><p className="text-xs text-muted-foreground">Phone</p><p className="text-foreground">{app.phone || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Program</p><p className="text-foreground">{app.program}</p></div>
              <div><p className="text-xs text-muted-foreground">Gender</p><p className="text-foreground">{app.gender || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Birthplace</p><p className="text-foreground">{app.birthplace || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Personal ID</p><p className="text-foreground">{app.personal_id || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Status</p>{statusBadge(app.status)}</div>
              <div><p className="text-xs text-muted-foreground">Date</p><p className="text-foreground">{new Date(app.created_at).toLocaleString()}</p></div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-muted-foreground">Motivation Letter</p>
              <p className="mt-1 whitespace-pre-wrap rounded-lg border border-border bg-secondary p-4 text-sm text-foreground">{app.motivation}</p>
            </div>
            {app.document_url && (
              <div className="mt-4">
                <p className="mb-2 text-xs text-muted-foreground">Uploaded Document</p>
                <iframe
                  src={getDocUrl(app.document_url)}
                  className="h-[500px] w-full rounded-lg border border-border"
                  title="Application Document"
                />
                <a
                  href={getDocUrl(app.document_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <FileText className="h-3.5 w-3.5" /> Download PDF
                </a>
              </div>
            )}
          </div>
        );
      })()}
    </AdminLayout>
  );
};

export default AdminApplications;
