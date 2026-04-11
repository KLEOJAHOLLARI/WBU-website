import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Send, Loader2, Users, Mail } from "lucide-react";

const inputBase =
  "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors";

interface Props {
  courseId: string;
  courseName: string;
  enrollments: Array<{ id: string; user_id: string; profiles?: { full_name: string; email: string } }>;
}

const ProfessorBulkMessage = ({ courseId, courseName, enrollments }: Props) => {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);

  const sendMessages = useMutation({
    mutationFn: async () => {
      if (!user || !enrollments.length) return;
      const messages = enrollments.map((enr) => ({
        user_id: enr.user_id,
        subject,
        body,
        sent_by_admin: false,
      }));

      // Insert in batches of 50
      for (let i = 0; i < messages.length; i += 50) {
        const batch = messages.slice(i, i + 50);
        const { error } = await supabase.from("student_messages").insert(batch);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: `Message sent to ${enrollments.length} students` });
      setSent(true);
      setSubject("");
      setBody("");
      setTimeout(() => setSent(false), 3000);
    },
    onError: (e: any) => toast({ title: "Error sending", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">Message Students</h2>
          <p className="text-sm text-muted-foreground">
            Send a message to all {enrollments.length} enrolled students in {courseName}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-sm text-muted-foreground">
          <Users className="h-4 w-4" /> {enrollments.length} recipients
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={`[${courseName}] Message subject...`}
            className={`${inputBase} w-full`}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type your message to all enrolled students..."
            className={`${inputBase} w-full`}
            rows={5}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            <Mail className="inline h-3 w-3 mr-1" />
            Students will see this in their Messages inbox
          </p>
          <button
            onClick={() => {
              if (confirm(`Send this message to ${enrollments.length} students?`)) {
                sendMessages.mutate();
              }
            }}
            disabled={!subject.trim() || !body.trim() || sendMessages.isPending || sent}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {sendMessages.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
            ) : sent ? (
              <><Send className="h-4 w-4" /> Sent!</>
            ) : (
              <><Send className="h-4 w-4" /> Send to All Students</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfessorBulkMessage;
