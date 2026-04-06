import StudentLayout from "@/components/StudentLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Mail, MailOpen, ChevronDown, ChevronUp } from "lucide-react";

const StudentMessages = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("student_messages").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["student-messages"] }),
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
      <h1 className="font-display text-2xl font-bold text-foreground">Messages</h1>
      <p className="text-sm text-muted-foreground">Messages from the administration</p>

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
                    <p className={`font-medium ${!msg.is_read ? "text-foreground" : "text-muted-foreground"}`}>{msg.subject}</p>
                    <p className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                {expandedId === msg.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {expandedId === msg.id && (
                <div className="border-t border-border px-4 py-3">
                  <p className="whitespace-pre-wrap text-sm text-foreground">{msg.body}</p>
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
