import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, GraduationCap, Mail, FileText, Check, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

type NotificationItem = {
  id: string;
  type: "grade" | "message" | "application" | "enrollment" | "tuition";
  title: string;
  description: string;
  href: string;
  createdAt: string;
  read: boolean;
};

const NotificationBell = () => {
  const { user, isAdmin, isProfessor } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id, isAdmin, isProfessor],
    queryFn: async (): Promise<NotificationItem[]> => {
      if (!user) return [];
      const items: NotificationItem[] = [];

      if (isAdmin) {
        const { data: apps } = await supabase
          .from("applications")
          .select("id, full_name, program, created_at, status")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(10);
        apps?.forEach((a) => {
          items.push({
            id: `app-${a.id}`,
            type: "application",
            title: "New application",
            description: `${a.full_name} — ${a.program}`,
            href: `/admin/applications?focus=${a.id}`,
            createdAt: a.created_at,
            read: false,
          });
        });

        // Overdue tuition charges
        const today = new Date().toISOString().slice(0, 10);
        const { data: overdueCharges } = await supabase
          .from("tuition_charges")
          .select("id, user_id, amount, currency, due_date, status, program")
          .lt("due_date", today)
          .in("status", ["unpaid", "partial"])
          .order("due_date", { ascending: true })
          .limit(20);
        if (overdueCharges && overdueCharges.length > 0) {
          const userIds = [...new Set(overdueCharges.map((c) => c.user_id))];
          const { data: profs } = await supabase
            .from("profiles")
            .select("user_id, full_name, student_id")
            .in("user_id", userIds);
          const nameMap = Object.fromEntries((profs || []).map((p) => [p.user_id, p]));
          overdueCharges.forEach((c) => {
            const p = nameMap[c.user_id];
            const days = Math.floor((Date.now() - new Date(c.due_date!).getTime()) / 86400000);
            items.push({
              id: `tuition-${c.id}`,
              type: "tuition",
              title: "Tuition overdue",
              description: `${p?.full_name || "Student"} — ${new Intl.NumberFormat("en-US", { style: "currency", currency: c.currency }).format(Number(c.amount))} · ${days}d late`,
              href: `/admin/tuition?charge=${c.id}&user=${c.user_id}`,
              createdAt: c.due_date!,
              read: false,
            });
          });
        }

        // Pending receipt uploads
        const { data: pendingReceipts } = await supabase
          .from("tuition_payments")
          .select("id, user_id, amount, currency, created_at")
          .eq("verification_status", "pending")
          .eq("uploaded_by_student", true)
          .order("created_at", { ascending: false })
          .limit(10);
        pendingReceipts?.forEach((r) => {
          items.push({
            id: `receipt-${r.id}`,
            type: "tuition",
            title: "Receipt awaiting review",
            description: `${new Intl.NumberFormat("en-US", { style: "currency", currency: r.currency }).format(Number(r.amount))} pending verification`,
            href: `/admin/tuition?payment=${r.id}&user=${r.user_id}`,
            createdAt: r.created_at,
            read: false,
          });
        });
      } else if (isProfessor) {
        const { data: advisorPrograms } = await supabase
          .from("program_advisors")
          .select("program")
          .eq("advisor_id", user.id);
        const programs = advisorPrograms?.map((p) => p.program) ?? [];
        if (programs.length) {
          const { data: courses } = await supabase
            .from("courses")
            .select("id")
            .in("program", programs);
          const courseIds = courses?.map((c) => c.id) ?? [];
          if (courseIds.length) {
            const { data: reqs } = await supabase
              .from("enrollment_requests")
              .select("id, created_at, status")
              .in("course_id", courseIds)
              .eq("status", "pending")
              .order("created_at", { ascending: false })
              .limit(10);
            reqs?.forEach((r) => {
              items.push({
                id: `enr-${r.id}`,
                type: "enrollment",
                title: "Enrollment request",
                description: "A student requested to enroll",
                href: `/professor/advisor?request=${r.id}`,
                createdAt: r.created_at,
                read: false,
              });
            });
          }
        }
      } else {
        // Student
        const { data: grades } = await supabase
          .from("grade_notifications")
          .select("id, course_name, component_name, score, max_score, is_read, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);
        grades?.forEach((g) => {
          items.push({
            id: `grade-${g.id}`,
            type: "grade",
            title: `Grade posted — ${g.course_name}`,
            description: `${g.component_name}: ${g.score ?? "-"} / ${g.max_score}`,
            href: `/portal/transcript?highlight=${encodeURIComponent(g.course_name)}`,
            createdAt: g.created_at,
            read: g.is_read,
          });
        });
        const { data: msgs } = await supabase
          .from("student_messages")
          .select("id, subject, created_at, is_read")
          .eq("user_id", user.id)
          .eq("is_read", false)
          .order("created_at", { ascending: false })
          .limit(10);
        msgs?.forEach((m) => {
          items.push({
            id: `msg-${m.id}`,
            type: "message",
            title: "New message",
            description: m.subject,
            href: `/portal/messages?msg=${m.id}`,
            createdAt: m.created_at,
            read: m.is_read,
          });
        });

        // Student overdue tuition
        const today = new Date().toISOString().slice(0, 10);
        const { data: stOverdue } = await supabase
          .from("tuition_charges")
          .select("id, amount, currency, due_date, status")
          .eq("user_id", user.id)
          .lt("due_date", today)
          .in("status", ["unpaid", "partial"])
          .order("due_date", { ascending: true })
          .limit(5);
        stOverdue?.forEach((c) => {
          const days = Math.floor((Date.now() - new Date(c.due_date!).getTime()) / 86400000);
          items.push({
            id: `tuition-${c.id}`,
            type: "tuition",
            title: "Tuition overdue",
            description: `${new Intl.NumberFormat("en-US", { style: "currency", currency: c.currency }).format(Number(c.amount))} · ${days} day${days !== 1 ? "s" : ""} late`,
            href: `/portal/tuition?charge=${c.id}`,
            createdAt: c.due_date!,
            read: false,
          });
        });
      }

      return items.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      if (!isAdmin && !isProfessor) {
        await supabase
          .from("grade_notifications")
          .update({ is_read: true })
          .eq("user_id", user.id)
          .eq("is_read", false);
        await supabase
          .from("student_messages")
          .update({ is_read: true })
          .eq("user_id", user.id)
          .eq("is_read", false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["student-unread-messages"] });
    },
  });

  const iconFor = (type: NotificationItem["type"]) => {
    switch (type) {
      case "grade":
        return <GraduationCap className="h-4 w-4 text-primary" />;
      case "message":
        return <Mail className="h-4 w-4 text-primary" />;
      case "tuition":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "application":
      case "enrollment":
        return <FileText className="h-4 w-4 text-primary" />;
    }
  };

  const [open, setOpen] = useState(false);

  const markOneRead = async (n: NotificationItem) => {
    if (n.read) return;

    // Optimistic update across all matching notification caches so the badge
    // and list update immediately without waiting for a refetch.
    queryClient.setQueriesData<NotificationItem[]>(
      { queryKey: ["notifications"] },
      (old) => (old ? old.map((it) => (it.id === n.id ? { ...it, read: true } : it)) : old)
    );

    try {
      if (n.id.startsWith("grade-")) {
        const id = n.id.slice("grade-".length);
        await supabase.from("grade_notifications").update({ is_read: true }).eq("id", id);
      } else if (n.id.startsWith("msg-")) {
        const id = n.id.slice("msg-".length);
        await supabase.from("student_messages").update({ is_read: true }).eq("id", id);
      }
    } finally {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["student-unread-messages"] });
    }
  };

  // Optimistic mark-all-read for instant badge update
  const handleMarkAllRead = () => {
    queryClient.setQueriesData<NotificationItem[]>(
      { queryKey: ["notifications"] },
      (old) => (old ? old.map((it) => ({ ...it, read: true })) : old)
    );
    markAllRead.mutate();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          {unreadCount > 0 && !isAdmin && !isProfessor && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleMarkAllRead}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <Link
                  key={n.id}
                  to={n.href}
                  onClick={() => {
                    setOpen(false);
                    markOneRead(n);
                  }}
                  className={`flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${
                    !n.read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    {iconFor(n.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.description}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.read && <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
