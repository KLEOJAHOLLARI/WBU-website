import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  MessageSquare, Hash, Pin, PinOff, Lock, Unlock, ThumbsUp,
  Send, Plus, ArrowLeft, Trash2, MessagesSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/* ── Types ────────────────────────────────────────────── */
type Course = { id: string; code: string; name: string };
type Profile = { user_id: string; full_name: string; avatar_url: string | null };

type ChatMsg = {
  id: string;
  course_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

type Thread = {
  id: string;
  course_id: string;
  author_id: string;
  title: string;
  body: string | null;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
};

type Reply = {
  id: string;
  thread_id: string;
  author_id: string;
  body: string;
  parent_reply_id: string | null;
  is_pinned: boolean;
  created_at: string;
};

/* ── Helpers ───────────────────────────────────────────── */
function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString();
}

function initials(name: string) {
  return name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "?";
}

/* ── Profile cache hook ────────────────────────────────── */
function useProfiles(userIds: string[]) {
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const fetched = useRef<Set<string>>(new Set());

  useEffect(() => {
    const ids = userIds.filter((id) => !fetched.current.has(id));
    if (!ids.length) return;
    ids.forEach((id) => fetched.current.add(id));
    supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", ids)
      .then(({ data }) => {
        if (data) {
          setProfiles((prev) => {
            const next = { ...prev };
            data.forEach((p) => { next[p.user_id] = p as Profile; });
            return next;
          });
        }
      });
  }, [userIds.join(",")]);

  return profiles;
}

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════ */
export const CourseDiscussions = ({ role }: { role: "student" | "professor" }) => {
  const { user } = useAuth();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [tab, setTab] = useState<"chat" | "forums">("chat");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  /* ── Load courses ─────────────────────────────────────── */
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["discussion-courses", user?.id, role],
    queryFn: async () => {
      if (role === "student") {
        const { data: enrolls } = await supabase
          .from("enrollments")
          .select("course_id")
          .eq("user_id", user!.id);
        const ids = Array.from(new Set((enrolls || []).map((e) => e.course_id)));
        if (!ids.length) return [];
        const { data } = await supabase
          .from("courses")
          .select("id, code, name")
          .in("id", ids)
          .order("name");
        return (data || []) as Course[];
      } else {
        const { data } = await supabase
          .from("courses")
          .select("id, code, name")
          .eq("professor_id", user!.id)
          .order("name");
        return (data || []) as Course[];
      }
    },
    enabled: !!user,
  });

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container max-w-7xl py-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Course Discussions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chat with classmates and professors, or start discussion threads for any course.
          </p>
        </div>
      </div>

      <div className="container max-w-7xl py-6">
        {coursesLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessagesSquare className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-lg font-medium text-foreground">No courses available</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {role === "student"
                ? "Enroll in a course to join discussions."
                : "You don't have any assigned courses yet."}
            </p>
          </div>
        ) : !selectedCourse ? (
          /* Course picker */
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCourseId(c.id)}
                className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <Hash className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">{c.code}</p>
                  <p className="truncate font-medium text-foreground">{c.name}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* Course detail view */
          <div className="space-y-4">
            {/* Breadcrumb + tabs */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => { setSelectedCourseId(null); setSelectedThreadId(null); }}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                All courses
              </button>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
                <button
                  onClick={() => setTab("chat")}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                    tab === "chat"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </button>
                <button
                  onClick={() => setTab("forums")}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                    tab === "forums"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <MessagesSquare className="h-4 w-4" />
                  Forums
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary">{selectedCourse.code}</span>
              <span className="text-muted-foreground">{selectedCourse.name}</span>
            </div>

            {tab === "chat" ? (
              <ChatPanel courseId={selectedCourse.id} role={role} />
            ) : (
              <ForumsPanel
                courseId={selectedCourse.id}
                role={role}
                selectedThreadId={selectedThreadId}
                onSelectThread={setSelectedThreadId}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   CHAT PANEL (real-time)
════════════════════════════════════════════════════════ */
const ChatPanel = ({ courseId, role }: { courseId: string; role: string }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["course-chat", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("course_chat_messages")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: true })
        .limit(200);
      return (data || []) as ChatMsg[];
    },
  });

  const userIds = Array.from(new Set(messages.map((m) => m.author_id)));
  const profiles = useProfiles(userIds);

  /* Realtime subscription */
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${courseId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "course_chat_messages", filter: `course_id=eq.${courseId}` },
        (payload) => {
          qc.setQueryData<ChatMsg[]>(["course-chat", courseId], (old = []) => {
            if (old.some((m) => m.id === payload.new.id)) return old;
            return [...old, payload.new as ChatMsg];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "course_chat_messages", filter: `course_id=eq.${courseId}` },
        (payload) => {
          qc.setQueryData<ChatMsg[]>(["course-chat", courseId], (old = []) =>
            old.filter((m) => m.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [courseId, qc]);

  /* Auto-scroll */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase
        .from("course_chat_messages")
        .insert({ course_id: courseId, author_id: user!.id, body });
      if (error) throw error;
    },
    onSuccess: () => setMessage(""),
    onError: () => toast({ title: "Failed to send message", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (msgId: string) => {
      const { error } = await supabase.from("course_chat_messages").delete().eq("id", msgId);
      if (error) throw error;
    },
    onError: () => toast({ title: "Failed to delete message", variant: "destructive" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["course-chat", courseId] }),
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  };

  return (
    <div className="flex h-[calc(100vh-18rem)] flex-col overflow-hidden rounded-xl border border-border bg-card">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const profile = profiles[msg.author_id];
            const isMine = msg.author_id === user?.id;
            const prevMsg = messages[i - 1];
            const showHeader = !prevMsg || prevMsg.author_id !== msg.author_id ||
              (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 5 * 60 * 1000);

            return (
              <div
                key={msg.id}
                className={cn(
                  "group flex gap-2.5",
                  isMine ? "flex-row-reverse" : "flex-row",
                  showHeader ? "mt-3" : "mt-0.5"
                )}
              >
                <div className="w-9 shrink-0">
                  {showHeader && (
                    <Avatar className="h-9 w-9">
                      {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                      <AvatarFallback className={cn("text-xs", isMine ? "bg-primary text-primary-foreground" : "bg-muted")}>
                        {initials(profile?.full_name || "")}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
                <div className={cn("flex max-w-[75%] flex-col", isMine ? "items-end" : "items-start")}>
                  {showHeader && (
                    <div className={cn("flex items-center gap-2 px-1", isMine && "flex-row-reverse")}>
                      <span className="text-xs font-medium text-foreground">
                        {profile?.full_name || "Unknown"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(msg.created_at)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2 text-sm leading-relaxed transition-colors",
                        isMine
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md bg-muted text-foreground"
                      )}
                    >
                      {msg.body}
                    </div>
                    {(isMine || role === "professor") && (
                      <button
                        onClick={() => deleteMutation.mutate(msg.id)}
                        className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        aria-label="Delete message"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border bg-card p-3">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          maxLength={500}
        />
        <button
          type="submit"
          disabled={!message.trim() || sendMutation.isPending}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   FORUMS PANEL
════════════════════════════════════════════════════════ */
const ForumsPanel = ({
  courseId,
  role,
  selectedThreadId,
  onSelectThread,
}: {
  courseId: string;
  role: string;
  selectedThreadId: string | null;
  onSelectThread: (id: string | null) => void;
}) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ["course-threads", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("course_threads")
        .select("*")
        .eq("course_id", courseId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      return (data || []) as Thread[];
    },
  });

  const userIds = Array.from(new Set(threads.map((t) => t.author_id)));
  const profiles = useProfiles(userIds);

  /* Upvote counts */
  const { data: upvoteMap = {} } = useQuery({
    queryKey: ["thread-upvotes", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("thread_upvotes")
        .select("thread_id, user_id")
        .in("thread_id", threads.map((t) => t.id));
      const map: Record<string, { count: number; voted: boolean }> = {};
      (data || []).forEach((u) => {
        if (!map[u.thread_id]) map[u.thread_id] = { count: 0, voted: false };
        map[u.thread_id].count++;
        if (u.user_id === user?.id) map[u.thread_id].voted = true;
      });
      threads.forEach((t) => { if (!map[t.id]) map[t.id] = { count: 0, voted: false }; });
      return map;
    },
    enabled: threads.length > 0,
  });

  /* Reply counts */
  const { data: replyCountMap = {} } = useQuery({
    queryKey: ["thread-reply-counts", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("thread_replies")
        .select("thread_id")
        .in("thread_id", threads.map((t) => t.id));
      const map: Record<string, number> = {};
      (data || []).forEach((r) => { map[r.thread_id] = (map[r.thread_id] || 0) + 1; });
      return map;
    },
    enabled: threads.length > 0,
  });

  /* Mutations */
  const togglePinThread = useMutation({
    mutationFn: async ({ threadId, pinned }: { threadId: string; pinned: boolean }) => {
      const { error } = await supabase
        .from("course_threads")
        .update({ is_pinned: pinned })
        .eq("id", threadId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["course-threads", courseId] }),
    onError: () => toast({ title: "Action failed", variant: "destructive" }),
  });

  const toggleLockThread = useMutation({
    mutationFn: async ({ threadId, locked }: { threadId: string; locked: boolean }) => {
      const { error } = await supabase
        .from("course_threads")
        .update({ is_locked: locked })
        .eq("id", threadId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["course-threads", courseId] }),
    onError: () => toast({ title: "Action failed", variant: "destructive" }),
  });

  const toggleUpvote = useMutation({
    mutationFn: async (threadId: string) => {
      const existing = upvoteMap[threadId];
      if (existing?.voted) {
        await supabase.from("thread_upvotes").delete().eq("thread_id", threadId).eq("user_id", user!.id);
      } else {
        await supabase.from("thread_upvotes").insert({ thread_id: threadId, user_id: user!.id });
      }
    },
    onMutate: (threadId) => {
      qc.setQueryData(["thread-upvotes", courseId], (old: any) => {
        const next = { ...old };
        const cur = next[threadId] || { count: 0, voted: false };
        next[threadId] = cur.voted
          ? { count: cur.count - 1, voted: false }
          : { count: cur.count + 1, voted: true };
        return next;
      });
    },
    onError: () => qc.invalidateQueries({ queryKey: ["thread-upvotes", courseId] }),
  });

  const deleteThread = useMutation({
    mutationFn: async (threadId: string) => {
      const { error } = await supabase.from("course_threads").delete().eq("id", threadId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course-threads", courseId] });
      toast({ title: "Thread deleted" });
    },
    onError: () => toast({ title: "Failed to delete thread", variant: "destructive" }),
  });

  if (selectedThreadId) {
    const thread = threads.find((t) => t.id === selectedThreadId);
    if (thread) {
      return (
        <ThreadDetail
          thread={thread}
          courseId={courseId}
          role={role}
          onBack={() => onSelectThread(null)}
          authorName={profiles[thread.author_id]?.full_name || "Unknown"}
        />
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{threads.length} thread{threads.length !== 1 ? "s" : ""}</p>
        <NewThreadButton courseId={courseId} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : threads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <MessagesSquare className="h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm">No discussions yet. Start one!</p>
          <NewThreadButton courseId={courseId} />
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => {
            const uv = upvoteMap[thread.id] || { count: 0, voted: false };
            const replyCount = replyCountMap[thread.id] || 0;
            const authorName = profiles[thread.author_id]?.full_name || "Unknown";
            const canPin = role === "professor";
            const canDelete = thread.author_id === user?.id || role === "professor";

            return (
              <div
                key={thread.id}
                className={cn(
                  "group rounded-xl border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm",
                  thread.is_pinned && "border-primary/40 bg-primary/5"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Upvote */}
                  <button
                    onClick={() => toggleUpvote.mutate(thread.id)}
                    className={cn(
                      "flex w-10 shrink-0 flex-col items-center gap-0.5 rounded-lg border p-1.5 transition-all",
                      uv.voted
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30 hover:bg-primary/5"
                    )}
                  >
                    <ThumbsUp className={cn("h-4 w-4", uv.voted && "fill-current")} />
                    <span className="text-xs font-semibold">{uv.count}</span>
                  </button>

                  {/* Content */}
                  <button
                    onClick={() => onSelectThread(thread.id)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      {thread.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                      {thread.is_locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                      <h3 className="font-medium text-foreground hover:text-primary transition-colors">
                        {thread.title}
                      </h3>
                    </div>
                    {thread.body && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{thread.body}</p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{authorName}</span>
                      <span>·</span>
                      <span>{timeAgo(thread.created_at)}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {replyCount}
                      </span>
                    </div>
                  </button>

                  {/* Professor actions */}
                  {(canPin || canDelete) && (
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {canPin && (
                        <button
                          onClick={() => togglePinThread.mutate({ threadId: thread.id, pinned: !thread.is_pinned })}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          title={thread.is_pinned ? "Unpin" : "Pin"}
                        >
                          {thread.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      {canPin && (
                        <button
                          onClick={() => toggleLockThread.mutate({ threadId: thread.id, locked: !thread.is_locked })}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          title={thread.is_locked ? "Unlock" : "Lock"}
                        >
                          {thread.is_locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => deleteThread.mutate(thread.id)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ── New Thread Button / Dialog ───────────────────────── */
const NewThreadButton = ({ courseId }: { courseId: string }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("course_threads")
        .insert({ course_id: courseId, author_id: user!.id, title: title.trim(), body: body.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course-threads", courseId] });
      setTitle(""); setBody(""); setOpen(false);
      toast({ title: "Discussion started!" });
    },
    onError: () => toast({ title: "Failed to create thread", variant: "destructive" }),
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:scale-105 hover:shadow-md"
      >
        <Plus className="h-4 w-4" />
        New Thread
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-foreground">Start a Discussion</h3>
        <div className="mt-4 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Thread title"
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            autoFocus
            maxLength={200}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Describe your question or topic (optional)"
            rows={4}
            className="w-full resize-none rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            maxLength={2000}
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => { setOpen(false); setTitle(""); setBody(""); }}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!title.trim() || createMutation.isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            {createMutation.isPending ? "Creating…" : "Create Thread"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   THREAD DETAIL (replies)
════════════════════════════════════════════════════════ */
const ThreadDetail = ({
  thread,
  courseId,
  role,
  onBack,
  authorName,
}: {
  thread: Thread;
  courseId: string;
  role: string;
  onBack: () => void;
  authorName: string;
}) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [reply, setReply] = useState("");

  const { data: replies = [], isLoading } = useQuery({
    queryKey: ["thread-replies", thread.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("thread_replies")
        .select("*")
        .eq("thread_id", thread.id)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: true });
      return (data || []) as Reply[];
    },
  });

  /* Realtime for replies */
  useEffect(() => {
    const channel = supabase
      .channel(`replies-${thread.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "thread_replies", filter: `thread_id=eq.${thread.id}` },
        (payload) => {
          qc.setQueryData<Reply[]>(["thread-replies", thread.id], (old = []) => [...old, payload.new as Reply]);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "thread_replies", filter: `thread_id=eq.${thread.id}` },
        (payload) => {
          qc.setQueryData<Reply[]>(["thread-replies", thread.id], (old = []) => old.filter((r) => r.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [thread.id, qc]);

  const userIds = Array.from(new Set([thread.author_id, ...replies.map((r) => r.author_id)]));
  const profiles = useProfiles(userIds);

  const replyMutation = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase
        .from("thread_replies")
        .insert({ thread_id: thread.id, author_id: user!.id, body });
      if (error) throw error;
    },
    onSuccess: () => { setReply(""); qc.invalidateQueries({ queryKey: ["thread-reply-counts", courseId] }); },
    onError: () => toast({ title: "Failed to post reply", variant: "destructive" }),
  });

  const deleteReply = useMutation({
    mutationFn: async (replyId: string) => {
      const { error } = await supabase.from("thread_replies").delete().eq("id", replyId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["thread-replies", thread.id] }),
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const togglePinReply = useMutation({
    mutationFn: async ({ replyId, pinned }: { replyId: string; pinned: boolean }) => {
      const { error } = await supabase.from("thread_replies").update({ is_pinned: pinned }).eq("id", replyId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["thread-replies", thread.id] }),
    onError: () => toast({ title: "Action failed", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to forums
      </button>

      {/* Thread header */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          {thread.is_pinned && (
            <span className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <Pin className="h-3 w-3" /> Pinned
            </span>
          )}
          {thread.is_locked && (
            <span className="flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              <Lock className="h-3 w-3" /> Locked
            </span>
          )}
        </div>
        <h2 className="mt-2 text-xl font-semibold text-foreground">{thread.title}</h2>
        {thread.body && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{thread.body}</p>}
        <div className="mt-3 flex items-center gap-2">
          <Avatar className="h-6 w-6">
            {profiles[thread.author_id]?.avatar_url && <AvatarImage src={profiles[thread.author_id]!.avatar_url!} />}
            <AvatarFallback className="text-[10px] bg-muted">{initials(authorName)}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">
            {authorName} · {timeAgo(thread.created_at)}
          </span>
        </div>
      </div>

      {/* Replies */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">{replies.length} repl{replies.length !== 1 ? "ies" : "y"}</p>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          replies.map((r) => {
            const prof = profiles[r.author_id];
            const canDelete = r.author_id === user?.id || role === "professor";
            const canPin = role === "professor";
            return (
              <div
                key={r.id}
                className={cn(
                  "group flex gap-3 rounded-xl border bg-card p-4 transition-colors",
                  r.is_pinned && "border-primary/40 bg-primary/5"
                )}
              >
                <Avatar className="h-9 w-9 shrink-0">
                  {prof?.avatar_url && <AvatarImage src={prof.avatar_url} />}
                  <AvatarFallback className="text-xs bg-muted">{initials(prof?.full_name || "")}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{prof?.full_name || "Unknown"}</span>
                    {r.is_pinned && (
                      <span className="flex items-center gap-1 text-xs text-primary">
                        <Pin className="h-3 w-3" /> Answer
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">· {timeAgo(r.created_at)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{r.body}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {canPin && (
                    <button
                      onClick={() => togglePinReply.mutate({ replyId: r.id, pinned: !r.is_pinned })}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      title={r.is_pinned ? "Unpin answer" : "Pin as answer"}
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => deleteReply.mutate(r.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reply input */}
      {thread.is_locked && role !== "professor" ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/50 py-4 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" />
          This discussion is locked
        </div>
      ) : (
        <form
          onSubmit={(e) => { e.preventDefault(); if (reply.trim()) replyMutation.mutate(reply.trim()); }}
          className="flex items-start gap-2"
        >
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply…"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={!reply.trim() || replyMutation.isPending}
            className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            Reply
          </button>
        </form>
      )}
    </div>
  );
};
