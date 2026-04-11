import StudentLayout from "@/components/StudentLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Mail, MailOpen, ChevronDown, ChevronUp, Send, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const StudentMessages = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; subject: string } | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeTo, setComposeTo] = useState("");

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["student-messages", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_messages")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Get professors from courses the student is enrolled in
  const { data: professors = [] } = useQuery({
    queryKey: ["student-professors", user?.id],
    queryFn: async () => {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", user!.id);
      if (!enrollments?.length) return [];

      const courseIds = [...new Set(enrollments.map((e) => e.course_id))];
      const { data: courses } = await supabase
        .from("courses")
        .select("professor_id, name")
        .in("id", courseIds)
        .not("professor_id", "is", null);
      if (!courses?.length) return [];

      const profIds = [...new Set(courses.map((c) => c.professor_id!))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", profIds);

      return (profiles || []).map((p) => ({
        id: p.user_id,
        name: p.full_name,
      }));
    },
    enabled: !!user,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("student_messages").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["student-messages"] }),
  });

  const sendReply = useMutation({
    mutationFn: async ({ subject, body }: { subject: string; body: string }) => {
      const { error } = await supabase.from("student_messages").insert({
        user_id: user!.id,
        subject,
        body,
        sent_by_admin: false,
        is_read: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-messages"] });
      toast.success("Reply sent");
      setReplyTo(null);
      setReplyBody("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const sendMessage = useMutation({
    mutationFn: async ({ subject, body }: { subject: string; body: string }) => {
      const { error } = await supabase.from("student_messages").insert({
        user_id: user!.id,
        subject,
        body,
        sent_by_admin: false,
        is_read: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-messages"] });
      toast.success("Message sent");
      setComposeOpen(false);
      setComposeSubject("");
      setComposeBody("");
      setComposeTo("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMessage = (msg: typeof messages[0]) => {
    if (expandedId === msg.id) {
      setExpandedId(null);
    } else {
      setExpandedId(msg.id);
      if (!msg.is_read) markRead.mutate(msg.id);
    }
  };

  return (
    <StudentLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Messages</h1>
          <p className="text-sm text-muted-foreground">Messages from administration and professors</p>
        </div>
        <Button onClick={() => setComposeOpen(true)}>
          <Send className="mr-2 h-4 w-4" /> New Message
        </Button>
      </div>

      {/* Compose Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {professors.length > 0 && (
              <div>
                <Label>To (Professor)</Label>
                <Select value={composeTo} onValueChange={setComposeTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a professor" />
                  </SelectTrigger>
                  <SelectContent>
                    {professors.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Subject</Label>
              <Input
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Message subject"
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Write your message..."
                rows={5}
              />
            </div>
            <Button
              className="w-full"
              disabled={!composeSubject.trim() || !composeBody.trim() || sendMessage.isPending}
              onClick={() => sendMessage.mutate({ subject: composeSubject, body: composeBody })}
            >
              {sendMessage.isPending ? "Sending…" : "Send Message"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : messages.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            No messages yet.
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`rounded-xl border bg-card transition-colors ${!msg.is_read ? "border-primary/40 bg-primary/5" : "border-border"}`}>
              <button
                onClick={() => toggleMessage(msg)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  {msg.is_read ? <MailOpen className="h-5 w-5 text-muted-foreground" /> : <Mail className="h-5 w-5 text-primary" />}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${!msg.is_read ? "text-foreground" : "text-muted-foreground"}`}>{msg.subject}</p>
                      {!msg.sent_by_admin && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">You</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                {expandedId === msg.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {expandedId === msg.id && (
                <div className="border-t border-border px-4 py-3 space-y-3">
                  <p className="whitespace-pre-wrap text-sm text-foreground">{msg.body}</p>
                  {msg.sent_by_admin && (
                    <>
                      {replyTo?.id === msg.id ? (
                        <div className="space-y-2 pt-2 border-t border-border">
                          <Textarea
                            value={replyBody}
                            onChange={(e) => setReplyBody(e.target.value)}
                            placeholder="Write your reply..."
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              disabled={!replyBody.trim() || sendReply.isPending}
                              onClick={() => sendReply.mutate({ subject: `Re: ${msg.subject}`, body: replyBody })}
                            >
                              {sendReply.isPending ? "Sending…" : "Send Reply"}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setReplyTo(null); setReplyBody(""); }}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setReplyTo({ id: msg.id, subject: msg.subject })}>
                          <Reply className="mr-2 h-3 w-3" /> Reply
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentMessages;
