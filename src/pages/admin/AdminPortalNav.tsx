import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { PORTAL_NAV_KEY, NavVisibility } from "@/hooks/usePortalNavVisibility";

const studentItems = [
  { to: "/portal", label: "Dashboard", locked: true },
  { to: "/portal/courses", label: "My Courses" },
  { to: "/portal/assignments", label: "Assignments" },
  { to: "/portal/seating", label: "My Seating" },
  { to: "/portal/office-hours", label: "Office Hours" },
  { to: "/portal/events", label: "Events" },
  { to: "/portal/internships", label: "Internships" },
  { to: "/portal/registration", label: "Course Registration" },
  { to: "/portal/retake", label: "Retake Courses" },
  { to: "/portal/transcript", label: "Transcript" },
  { to: "/portal/timetable", label: "Timetable" },
  { to: "/portal/exams", label: "Exam Schedule" },
  { to: "/portal/tuition", label: "Tuition" },
  { to: "/portal/tuition/estimate", label: "Tuition Estimate" },
  { to: "/portal/documents", label: "Documents" },
  { to: "/portal/feedback", label: "Professor Feedback" },
  { to: "/portal/id-card", label: "Digital ID Card" },
  { to: "/portal/access-history", label: "Access History" },
  { to: "/portal/messages", label: "Messages" },
  { to: "/portal/notifications", label: "Notifications" },
  { to: "/portal/profile", label: "My Profile" },
];

const professorItems = [
  { to: "/professor", label: "Dashboard", locked: true },
  { to: "/professor/courses", label: "My Courses" },
  { to: "/professor/assignments", label: "Assignments" },
  { to: "/professor/seating", label: "Seating" },
  { to: "/professor/office-hours", label: "Office Hours" },
  { to: "/professor/advisor", label: "Advisor" },
  { to: "/professor/transcripts", label: "Transcripts" },
  { to: "/professor/exams", label: "Exam Schedule" },
  { to: "/professor/announcements", label: "Announcements" },
  { to: "/professor/performance", label: "My Performance" },
  { to: "/professor/id-card", label: "Faculty ID Card" },
  { to: "/professor/profile", label: "My Profile" },
];

const AdminPortalNav = () => {
  const qc = useQueryClient();
  const [value, setValue] = useState<NavVisibility>({ student: {}, professor: {} });
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-portal-nav-visibility"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", PORTAL_NAV_KEY)
        .maybeSingle();
      return (data?.value as NavVisibility | null) || { student: {}, professor: {} };
    },
  });

  useEffect(() => {
    if (data) setValue(data);
  }, [data]);

  const isVisible = (role: "student" | "professor", to: string) =>
    value[role]?.[to] !== false;

  const toggle = (role: "student" | "professor", to: string) => {
    setValue((v) => ({
      ...v,
      [role]: { ...v[role], [to]: !isVisible(role, to) },
    }));
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("system_settings")
      .upsert({ key: PORTAL_NAV_KEY, value: value as any }, { onConflict: "key" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Portal navigation updated");
    qc.invalidateQueries({ queryKey: ["portal-nav-visibility"] });
    qc.invalidateQueries({ queryKey: ["admin-portal-nav-visibility"] });
  };

  const renderList = (
    role: "student" | "professor",
    items: { to: string; label: string; locked?: boolean }[]
  ) => (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.to}
          className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5"
        >
          <div>
            <p className="text-sm font-medium text-foreground">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.to}</p>
          </div>
          <Switch
            checked={isVisible(role, item.to)}
            disabled={item.locked}
            onCheckedChange={() => !item.locked && toggle(role, item.to)}
          />
        </div>
      ))}
    </div>
  );

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Portal Navigation</h1>
          <p className="text-sm text-muted-foreground">
            Choose which links appear in the Student and Professor portal sidebars.
          </p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Student Portal</CardTitle>
          </CardHeader>
          <CardContent>{renderList("student", studentItems)}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Professor Portal</CardTitle>
          </CardHeader>
          <CardContent>{renderList("professor", professorItems)}</CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPortalNav;
