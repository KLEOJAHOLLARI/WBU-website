import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, Megaphone, CheckCheck, Check, ExternalLink, Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import StudentLayout from "@/components/StudentLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type PushItem = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  sent_at: string;
  read: boolean;
};

type AnnouncementItem = {
  id: string;
  title: string;
  body: string;
  author_name: string;
  course_id: string | null;
  program: string | null;
  created_at: string;
  read: boolean;
};

const READ_KEY = "wbu:read-announcements";

const loadReadIds = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]"));
  } catch {
    return new Set();
  }
};

const saveReadIds = (ids: Set<string>) => {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
};

const StudentNotifications = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<Set<string>>(loadReadIds);

  // Push notifications targeted to this student
  const { data: pushItems = [], isLoading: loadingPush } = useQuery({
    queryKey: ["notif-center-push", user?.id, profile?.program, profile?.current_year],
    queryFn: async (): Promise<PushItem[]> => {
      if (!user) return [];
      let q = supabase
        .from("push_notifications")
        .select("id,title,body,link,sent_at,audience_role,audience_program,audience_year")
        .order("sent_at", { ascending: false })
        .limit(100);
      const { data, error } = await q;
      if (error) throw error;

      const filtered = (data || []).filter((n: any) => {
        if (n.audience_role && !["all", "students", "user"].includes(n.audience_role)) return false;
        if (n.audience_program && n.audience_program !== profile?.program) return false;
        if (n.audience_year && n.audience_year !== profile?.current_year) return false;
        return true;
      });

      const ids = filtered.map((n: any) => n.id);
      let readSet = new Set<string>();
      if (ids.length) {
        const { data: reads } = await supabase
          .from("push_notification_reads")
          .select("notification_id")
          .eq("user_id", user.id)
          .in("notification_id", ids);
        readSet = new Set((reads || []).map((r: any) => r.notification_id));
      }

      return filtered.map((n: any) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        link: n.link,
        sent_at: n.sent_at,
        read: readSet.has(n.id),
      }));
    },
    enabled: !!user,
  });

  // Announcements visible to this student
  const { data: announcements = [], isLoading: loadingAnn } = useQuery({
    queryKey: ["notif-center-announcements", user?.id, profile?.program],
    queryFn: async (): Promise<AnnouncementItem[]> => {
      if (!user) return [];

      // Course IDs the student is enrolled in
      const { data: enrolls } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", user.id);
      const courseIds = (enrolls || []).map((e: any) => e.course_id);

      const { data, error } = await supabase
        .from("announcements")
        .select("id,title,body,author_name,course_id,program,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;

      const filtered = (data || []).filter((a: any) => {
        // global
        if (!a.course_id && !a.program) return true;
        // program-targeted
        if (a.program && a.program === profile?.program) return true;
        // course-targeted
        if (a.course_id && courseIds.includes(a.course_id)) return true;
        return false;
      });

      return filtered.map((a: any) => ({
        ...a,
        read: readAnnouncementIds.has(a.id),
      }));
    },
    enabled: !!user,
  });

  const markPushRead = useMutation({
    mutationFn: async (id: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("push_notification_reads")
        .insert({ notification_id: id, user_id: user.id });
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notif-center-push"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const markAllPushRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const unread = pushItems.filter((n) => !n.read);
      if (!unread.length) return;
      const rows = unread.map((n) => ({ notification_id: n.id, user_id: user.id }));
      const { error } = await supabase
        .from("push_notification_reads")
        .upsert(rows, { onConflict: "notification_id,user_id", ignoreDuplicates: true });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("All notifications marked as read");
      qc.invalidateQueries({ queryKey: ["notif-center-push"] });
    },
  });

  const toggleAnnouncementRead = (id: string) => {
    const next = new Set(readAnnouncementIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setReadAnnouncementIds(next);
    saveReadIds(next);
    qc.invalidateQueries({ queryKey: ["notif-center-announcements"] });
  };

  const markAllAnnouncementsRead = () => {
    const next = new Set(readAnnouncementIds);
    announcements.forEach((a) => next.add(a.id));
    setReadAnnouncementIds(next);
    saveReadIds(next);
    qc.invalidateQueries({ queryKey: ["notif-center-announcements"] });
    toast.success("All announcements marked as read");
  };

  const unreadPush = useMemo(() => pushItems.filter((n) => !n.read).length, [pushItems]);
  const unreadAnn = useMemo(() => announcements.filter((a) => !a.read).length, [announcements]);
  const totalUnread = unreadPush + unreadAnn;

  return (
    <StudentLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <BellRing className="h-6 w-6 text-primary" /> Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalUnread > 0 ? `${totalUnread} unread item${totalUnread === 1 ? "" : "s"}` : "You're all caught up"}
          </p>
        </div>
      </div>

      <Tabs defaultValue="push">
        <TabsList>
          <TabsTrigger value="push" className="gap-2">
            <Bell className="h-4 w-4" /> Notifications
            {unreadPush > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">{unreadPush}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="ann" className="gap-2">
            <Megaphone className="h-4 w-4" /> Announcements
            {unreadAnn > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">{unreadAnn}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Push notifications */}
        <TabsContent value="push" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" disabled={!unreadPush || markAllPushRead.isPending} onClick={() => markAllPushRead.mutate()}>
              <CheckCheck className="mr-1.5 h-4 w-4" /> Mark all as read
            </Button>
          </div>

          {loadingPush ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : pushItems.length === 0 ? (
            <EmptyState text="No notifications yet" />
          ) : (
            pushItems.map((n) => (
              <div
                key={n.id}
                className={`rounded-xl border p-4 transition-colors ${
                  n.read ? "border-border bg-card" : "border-primary/40 bg-primary/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                      <h3 className="font-semibold text-foreground">{n.title}</h3>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{n.body}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.sent_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {!n.read && (
                      <Button size="sm" variant="ghost" onClick={() => markPushRead.mutate(n.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    {n.link && (
                      <Button size="sm" variant="outline" asChild>
                        <Link to={n.link} onClick={() => !n.read && markPushRead.mutate(n.id)}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* Announcements */}
        <TabsContent value="ann" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" disabled={!unreadAnn} onClick={markAllAnnouncementsRead}>
              <CheckCheck className="mr-1.5 h-4 w-4" /> Mark all as read
            </Button>
          </div>

          {loadingAnn ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : announcements.length === 0 ? (
            <EmptyState text="No announcements yet" />
          ) : (
            announcements.map((a) => (
              <div
                key={a.id}
                className={`rounded-xl border p-4 transition-colors ${
                  a.read ? "border-border bg-card" : "border-accent/40 bg-accent/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {!a.read && <span className="h-2 w-2 rounded-full bg-accent" />}
                      <h3 className="font-semibold text-foreground">{a.title}</h3>
                      {a.program && (
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{a.program}</span>
                      )}
                      {a.course_id && (
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">Course</span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-foreground whitespace-pre-wrap leading-relaxed">{a.body}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {a.author_name || "Administration"} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => toggleAnnouncementRead(a.id)} title={a.read ? "Mark unread" : "Mark read"}>
                    <Check className={`h-4 w-4 ${a.read ? "text-emerald-600" : ""}`} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </StudentLayout>
  );
};

const EmptyState = ({ text }: { text: string }) => (
  <div className="rounded-xl border border-dashed border-border p-12 text-center">
    <Inbox className="mx-auto h-10 w-10 text-muted-foreground/50" />
    <p className="mt-3 text-sm text-muted-foreground">{text}</p>
  </div>
);

export default StudentNotifications;
