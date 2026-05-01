import AdminLayout from "@/components/AdminLayout";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MessageSquareWarning, Trash2, Send } from "lucide-react";
import { ListRowsSkeleton } from "@/components/admin/AdminSkeleton";
import AdminErrorBanner from "@/components/admin/AdminErrorBanner";

type Complaint = {
  id: string; user_id: string | null; is_anonymous: boolean;
  submitter_name: string; submitter_email: string;
  category: string; subject: string; message: string;
  status: string; priority: string;
  admin_response: string | null; responded_at: string | null;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-rose-100 text-rose-800",
  in_review: "bg-amber-100 text-amber-800",
  resolved: "bg-emerald-100 text-emerald-800",
  closed: "bg-slate-100 text-slate-700",
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  normal: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-rose-100 text-rose-800",
};

const AdminComplaints = () => {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [responses, setResponses] = useState<Record<string, string>>({});

  const { data: complaints = [], isLoading, error, refetch } = useQuery({
    queryKey: ["admin-complaints"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaint_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Complaint[];
    },
  });

  useEffect(() => {
    if (error) toast.error("Couldn't load complaints");
  }, [error]);

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Complaint> }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const finalPatch: any = { ...patch };
      if (patch.admin_response) {
        finalPatch.responded_by = userId;
        finalPatch.responded_at = new Date().toISOString();
      }
      const { error } = await supabase.from("complaint_submissions").update(finalPatch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-complaints"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("complaint_submissions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["admin-complaints"] });
    },
  });

  const filtered = filter === "all" ? complaints : complaints.filter((c) => c.status === filter);
  const counts = {
    all: complaints.length,
    open: complaints.filter((c) => c.status === "open").length,
    in_review: complaints.filter((c) => c.status === "in_review").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
        <MessageSquareWarning className="h-6 w-6" /> Complaints & Suggestions
      </h1>
      <p className="text-sm text-muted-foreground">Review submissions from students and respond</p>

      <Tabs value={filter} onValueChange={setFilter} className="mt-6">
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="open">Open ({counts.open})</TabsTrigger>
          <TabsTrigger value="in_review">In Review ({counts.in_review})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({counts.resolved})</TabsTrigger>
        </TabsList>
      </Tabs>

      {error && (
        <div className="mt-4">
          <AdminErrorBanner error={error} onRetry={() => refetch()} />
        </div>
      )}

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <ListRowsSkeleton rows={5} />
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No submissions in this category.
          </div>
        ) : filtered.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-foreground">{c.subject}</h3>
                  <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${STATUS_STYLES[c.status]}`}>{c.status.replace("_", " ")}</span>
                  <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${PRIORITY_STYLES[c.priority]}`}>{c.priority}</span>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{c.category}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {c.is_anonymous ? "Anonymous" : `${c.submitter_name || "—"} (${c.submitter_email || "no email"})`}
                  {" · "}{new Date(c.created_at).toLocaleString()}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">{c.message}</p>

                {c.admin_response && (
                  <div className="mt-3 rounded-lg bg-muted/50 p-3">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase">Admin Response</p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{c.admin_response}</p>
                    {c.responded_at && <p className="text-[10px] text-muted-foreground mt-1">{new Date(c.responded_at).toLocaleString()}</p>}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 min-w-[160px]">
                <Select value={c.status} onValueChange={(v) => update.mutate({ id: c.id, patch: { status: v } })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={c.priority} onValueChange={(v) => update.mutate({ id: c.id, patch: { priority: v } })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => remove.mutate(c.id)}>
                  <Trash2 className="h-3 w-3 mr-1 text-destructive" /> Delete
                </Button>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <Textarea
                placeholder="Write a response..."
                value={responses[c.id] ?? c.admin_response ?? ""}
                onChange={(e) => setResponses({ ...responses, [c.id]: e.target.value })}
                rows={2}
                className="text-sm"
              />
              <Button
                size="sm"
                onClick={() => update.mutate({ id: c.id, patch: { admin_response: responses[c.id] ?? "" } })}
                disabled={!(responses[c.id] ?? "").trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminComplaints;
