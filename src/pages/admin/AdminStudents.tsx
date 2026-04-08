import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Send, FileText, CheckCircle, XCircle } from "lucide-react";

const AdminStudents = () => {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [sending, setSending] = useState(false);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-students"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
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

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold text-foreground">Student Management</h1>
      <p className="text-sm text-muted-foreground">View students, manage documents, and send messages</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Student list */}
        <div className="lg:col-span-1">
          <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Students</h2>
          <div className="space-y-2">
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : profiles.length === 0 ? (
              <p className="text-muted-foreground text-sm">No registered students yet.</p>
            ) : (
              profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedUserId(p.user_id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedUserId === p.user_id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-secondary"
                  }`}
                >
                  <p className="font-medium text-foreground">{p.full_name || "Unnamed"}</p>
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
          ) : (
            <div className="space-y-6">
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
                            className="rounded p-1.5 text-muted-foreground hover:bg-green-100 hover:text-green-700"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => updateDocStatus.mutate({ id: doc.id, status: "rejected" })}
                            className="rounded p-1.5 text-muted-foreground hover:bg-red-100 hover:text-red-700"
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
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminStudents;
