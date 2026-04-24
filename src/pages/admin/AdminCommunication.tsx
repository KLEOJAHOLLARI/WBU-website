import { useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, Clock, FileText, Plus, Trash2, Pencil, Megaphone, CheckCircle2, XCircle, CalendarClock } from "lucide-react";
import { format } from "date-fns";

type Template = { id: string; name: string; subject: string; body: string };
type Scheduled = {
  id: string;
  subject: string;
  body: string;
  target_programs: string[];
  scheduled_for: string;
  status: string;
  sent_at: string | null;
  recipient_count: number;
  error_message: string | null;
  created_at: string;
};

const AdminCommunication = () => {
  const { toast } = useToast();
  const qc = useQueryClient();

  // Composer state
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [scheduleAt, setScheduleAt] = useState("");

  // Template dialog
  const [tplDialog, setTplDialog] = useState(false);
  const [tplEditing, setTplEditing] = useState<Template | null>(null);
  const [tplName, setTplName] = useState("");
  const [tplSubject, setTplSubject] = useState("");
  const [tplBody, setTplBody] = useState("");

  const { data: programs = [] } = useQuery({
    queryKey: ["comm-programs"],
    queryFn: async () => {
      const { data } = await supabase.from("programs").select("slug, title").order("title");
      return data || [];
    },
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["comm-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_templates")
        .select("id, name, subject, body")
        .order("name");
      if (error) throw error;
      return (data as Template[]) || [];
    },
  });

  const { data: history = [] } = useQuery<Scheduled[]>({
    queryKey: ["comm-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as Scheduled[]) || [];
    },
    refetchInterval: 15000,
  });

  // Preview recipient count
  const { data: recipientCount = 0 } = useQuery({
    queryKey: ["comm-recipient-count", selectedPrograms],
    queryFn: async () => {
      let q = supabase.from("profiles").select("user_id", { count: "exact", head: true }).eq("account_status", "approved");
      if (selectedPrograms.length > 0) q = q.in("program", selectedPrograms);
      const { count } = await q;
      return count || 0;
    },
  });

  const resetComposer = () => {
    setSubject("");
    setBody("");
    setSelectedPrograms([]);
    setMode("now");
    setScheduleAt("");
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!subject.trim() || !body.trim()) throw new Error("Subject and body are required");
      const { data: auth } = await supabase.auth.getUser();
      const admin_id = auth.user?.id;
      if (!admin_id) throw new Error("Not authenticated");

      if (mode === "now") {
        // Fetch recipient user_ids
        let q = supabase.from("profiles").select("user_id").eq("account_status", "approved");
        if (selectedPrograms.length > 0) q = q.in("program", selectedPrograms);
        const { data: recips, error: rErr } = await q;
        if (rErr) throw rErr;
        const rows = (recips || []).map((r: any) => ({
          user_id: r.user_id,
          subject: subject.trim(),
          body: body.trim(),
          sent_by_admin: true,
          is_read: false,
        }));
        if (rows.length === 0) throw new Error("No recipients match the selected filters");
        for (let i = 0; i < rows.length; i += 500) {
          const chunk = rows.slice(i, i + 500);
          const { error } = await supabase.from("student_messages").insert(chunk);
          if (error) throw error;
        }
        // Log into history as already-sent
        await supabase.from("scheduled_announcements").insert({
          subject: subject.trim(),
          body: body.trim(),
          target_programs: selectedPrograms,
          scheduled_for: new Date().toISOString(),
          status: "sent",
          sent_at: new Date().toISOString(),
          recipient_count: rows.length,
          created_by: admin_id,
        });
        return { sent: rows.length };
      } else {
        if (!scheduleAt) throw new Error("Pick a schedule date/time");
        const when = new Date(scheduleAt);
        if (when.getTime() <= Date.now()) throw new Error("Schedule time must be in the future");
        const { error } = await supabase.from("scheduled_announcements").insert({
          subject: subject.trim(),
          body: body.trim(),
          target_programs: selectedPrograms,
          scheduled_for: when.toISOString(),
          status: "pending",
          created_by: admin_id,
        });
        if (error) throw error;
        return { scheduled: true };
      }
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["comm-history"] });
      resetComposer();
      if (res.scheduled) toast({ title: "Scheduled", description: "Announcement will be delivered automatically." });
      else toast({ title: "Sent", description: `Delivered to ${res.sent} student${res.sent === 1 ? "" : "s"}.` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scheduled_announcements")
        .update({ status: "cancelled" })
        .eq("id", id)
        .eq("status", "pending");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comm-history"] });
      toast({ title: "Cancelled" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveTemplate = useMutation({
    mutationFn: async () => {
      if (!tplName.trim() || !tplSubject.trim() || !tplBody.trim()) throw new Error("All fields required");
      const { data: auth } = await supabase.auth.getUser();
      const payload = {
        name: tplName.trim(),
        subject: tplSubject.trim(),
        body: tplBody.trim(),
        created_by: auth.user?.id,
      };
      if (tplEditing) {
        const { error } = await supabase.from("message_templates").update(payload).eq("id", tplEditing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("message_templates").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comm-templates"] });
      setTplDialog(false);
      setTplEditing(null);
      setTplName("");
      setTplSubject("");
      setTplBody("");
      toast({ title: "Template saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("message_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comm-templates"] });
      toast({ title: "Template deleted" });
    },
  });

  const applyTemplate = (t: Template) => {
    setSubject(t.subject);
    setBody(t.body);
    toast({ title: `Loaded "${t.name}"` });
  };

  const openNewTemplate = () => {
    setTplEditing(null);
    setTplName("");
    setTplSubject(subject);
    setTplBody(body);
    setTplDialog(true);
  };

  const openEditTemplate = (t: Template) => {
    setTplEditing(t);
    setTplName(t.name);
    setTplSubject(t.subject);
    setTplBody(t.body);
    setTplDialog(true);
  };

  const statusBadge = (s: string) => {
    if (s === "sent") return <Badge className="bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/10"><CheckCircle2 className="h-3 w-3 mr-1" />Sent</Badge>;
    if (s === "pending") return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    if (s === "failed") return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    if (s === "cancelled") return <Badge variant="outline">Cancelled</Badge>;
    return <Badge variant="outline">{s}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Communication Center</h1>
            <p className="text-sm text-muted-foreground">Send bulk announcements to students by program, schedule for later, and manage templates.</p>
          </div>
        </div>

        <Tabs defaultValue="compose" className="space-y-4">
          <TabsList>
            <TabsTrigger value="compose"><Send className="h-4 w-4 mr-2" />Compose</TabsTrigger>
            <TabsTrigger value="history"><CalendarClock className="h-4 w-4 mr-2" />History</TabsTrigger>
            <TabsTrigger value="templates"><FileText className="h-4 w-4 mr-2" />Templates</TabsTrigger>
          </TabsList>

          {/* COMPOSE */}
          <TabsContent value="compose" className="space-y-4">
            <div className="grid lg:grid-cols-[1fr_320px] gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">New announcement</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Subject</Label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Important notice about..." maxLength={200} />
                  </div>
                  <div>
                    <Label>Message</Label>
                    <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder="Write your message..." maxLength={5000} />
                    <p className="text-xs text-muted-foreground mt-1">{body.length}/5000</p>
                  </div>

                  <div>
                    <Label>Target programs</Label>
                    <p className="text-xs text-muted-foreground mb-2">Leave empty to send to all approved students.</p>
                    <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-auto border border-border rounded-md p-3">
                      {programs.map((p: any) => {
                        const checked = selectedPrograms.includes(p.slug);
                        return (
                          <label key={p.slug} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                if (v) setSelectedPrograms([...selectedPrograms, p.slug]);
                                else setSelectedPrograms(selectedPrograms.filter((s) => s !== p.slug));
                              }}
                            />
                            <span className="truncate">{p.title}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Label>Delivery</Label>
                    <div className="flex gap-2 mt-1">
                      <Button type="button" variant={mode === "now" ? "default" : "outline"} size="sm" onClick={() => setMode("now")}>
                        <Send className="h-4 w-4 mr-2" />Send now
                      </Button>
                      <Button type="button" variant={mode === "schedule" ? "default" : "outline"} size="sm" onClick={() => setMode("schedule")}>
                        <Clock className="h-4 w-4 mr-2" />Schedule
                      </Button>
                    </div>
                    {mode === "schedule" && (
                      <div className="mt-3">
                        <Label>Send at</Label>
                        <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}>
                      {mode === "now" ? "Send to " + recipientCount + " student" + (recipientCount === 1 ? "" : "s") : "Schedule announcement"}
                    </Button>
                    <Button variant="outline" onClick={resetComposer}>Clear</Button>
                    <Button variant="ghost" onClick={openNewTemplate} disabled={!subject && !body}>
                      Save as template
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-muted p-3 space-y-2">
                    <p className="text-xs text-muted-foreground">Recipients</p>
                    <p className="text-2xl font-bold text-foreground">{recipientCount}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedPrograms.length === 0 ? "All approved students" : `${selectedPrograms.length} program${selectedPrograms.length === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  {templates.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Quick templates</p>
                      <div className="space-y-1 max-h-64 overflow-auto">
                        {templates.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => applyTemplate(t)}
                            className="w-full text-left rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors border border-border"
                          >
                            <p className="font-medium truncate">{t.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{t.subject}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* HISTORY */}
          <TabsContent value="history">
            <Card>
              <CardContent className="p-0">
                {history.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">No announcements yet.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {history.map((h) => (
                      <div key={h.id} className="p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-foreground truncate">{h.subject}</p>
                              {statusBadge(h.status)}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{h.body}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                              <span>{h.status === "pending" ? "Scheduled for " : "Sent "} {format(new Date(h.sent_at || h.scheduled_for), "PPp")}</span>
                              {h.recipient_count > 0 && <span>• {h.recipient_count} recipient{h.recipient_count === 1 ? "" : "s"}</span>}
                              {h.target_programs.length > 0 && <span>• {h.target_programs.length} program{h.target_programs.length === 1 ? "" : "s"}</span>}
                              {h.target_programs.length === 0 && <span>• All approved students</span>}
                            </div>
                            {h.error_message && <p className="text-xs text-destructive mt-1">Error: {h.error_message}</p>}
                          </div>
                          {h.status === "pending" && (
                            <Button size="sm" variant="outline" onClick={() => cancelMutation.mutate(h.id)}>Cancel</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TEMPLATES */}
          <TabsContent value="templates">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Message templates</CardTitle>
                <Button size="sm" onClick={() => { setTplEditing(null); setTplName(""); setTplSubject(""); setTplBody(""); setTplDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />New template
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {templates.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">No templates yet. Create reusable messages for common announcements.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {templates.map((t) => (
                      <div key={t.id} className="p-4 flex items-start justify-between gap-4 hover:bg-muted/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{t.name}</p>
                          <p className="text-sm text-muted-foreground mt-1 truncate">{t.subject}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.body}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => applyTemplate(t)}>Use</Button>
                          <Button size="sm" variant="ghost" onClick={() => openEditTemplate(t)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this template?")) deleteTemplate.mutate(t.id); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Template dialog */}
        <Dialog open={tplDialog} onOpenChange={setTplDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{tplEditing ? "Edit template" : "New template"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="e.g. Enrollment reminder" />
              </div>
              <div>
                <Label>Subject</Label>
                <Input value={tplSubject} onChange={(e) => setTplSubject(e.target.value)} />
              </div>
              <div>
                <Label>Body</Label>
                <Textarea value={tplBody} onChange={(e) => setTplBody(e.target.value)} rows={6} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTplDialog(false)}>Cancel</Button>
              <Button onClick={() => saveTemplate.mutate()} disabled={saveTemplate.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminCommunication;
