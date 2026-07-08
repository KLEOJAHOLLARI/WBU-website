import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { PORTAL_NAV_KEY, NavVisibility } from "@/hooks/usePortalNavVisibility";
import { GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Item = { to: string; label: string; locked?: boolean };

const studentItems: Item[] = [
  { to: "/portal", label: "Dashboard", locked: true },
  { to: "/portal/courses", label: "My Courses" },
  { to: "/portal/assignments", label: "Assignments" },
  { to: "/portal/seating", label: "My Seating" },
  { to: "/portal/office-hours", label: "Office Hours" },
  { to: "/portal/events", label: "Events" },
  { to: "/portal/internships", label: "Internships" },
  { to: "/portal/registration", label: "Course Registration" },
  { to: "/portal/retake", label: "Retake Courses" },
  { to: "/portal/resits", label: "Resit Exams" },
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

const professorItems: Item[] = [
  { to: "/professor", label: "Dashboard", locked: true },
  { to: "/professor/courses", label: "My Courses" },
  { to: "/professor/assignments", label: "Assignments" },
  { to: "/professor/seating", label: "Seating" },
  { to: "/professor/office-hours", label: "Office Hours" },
  { to: "/professor/advisor", label: "Advisor" },
  { to: "/professor/transcripts", label: "Transcripts" },
  { to: "/professor/exams", label: "Exam Schedule" },
  { to: "/professor/resits", label: "Resit Exams" },
  { to: "/professor/announcements", label: "Announcements" },
  { to: "/professor/performance", label: "My Performance" },
  { to: "/professor/id-card", label: "Faculty ID Card" },
  { to: "/professor/profile", label: "My Profile" },
];

const applyOrder = (items: Item[], order?: string[]): Item[] => {
  if (!order || order.length === 0) return items;
  const idx = (p: string) => {
    const i = order.indexOf(p);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...items].sort((a, b) => idx(a.to) - idx(b.to));
};

const SortableRow = ({
  item,
  visible,
  onToggle,
}: {
  item: Item;
  visible: boolean;
  onToggle: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.to,
    disabled: item.locked,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5"
    >
      <button
        {...attributes}
        {...listeners}
        disabled={item.locked}
        className={`touch-none rounded p-1 text-muted-foreground hover:bg-muted ${
          item.locked ? "cursor-not-allowed opacity-40" : "cursor-grab active:cursor-grabbing"
        }`}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
        <p className="text-xs text-muted-foreground truncate">{item.to}</p>
      </div>
      <Switch checked={visible} disabled={item.locked} onCheckedChange={onToggle} />
    </div>
  );
};

const AdminPortalNav = () => {
  const qc = useQueryClient();
  const [value, setValue] = useState<NavVisibility>({ student: {}, professor: {} });
  const [studentList, setStudentList] = useState<Item[]>(studentItems);
  const [professorList, setProfessorList] = useState<Item[]>(professorItems);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
    if (data) {
      setValue(data);
      setStudentList(applyOrder(studentItems, data.studentOrder));
      setProfessorList(applyOrder(professorItems, data.professorOrder));
    }
  }, [data]);

  const isVisible = (role: "student" | "professor", to: string) =>
    value[role]?.[to] !== false;

  const toggle = (role: "student" | "professor", to: string) => {
    setValue((v) => ({
      ...v,
      [role]: { ...v[role], [to]: !isVisible(role, to) },
    }));
  };

  const handleDragEnd = (role: "student" | "professor") => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const list = role === "student" ? studentList : professorList;
    const oldIndex = list.findIndex((i) => i.to === active.id);
    const newIndex = list.findIndex((i) => i.to === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(list, oldIndex, newIndex);
    if (role === "student") setStudentList(next);
    else setProfessorList(next);
  };

  const save = async () => {
    setSaving(true);
    const payload: NavVisibility = {
      ...value,
      studentOrder: studentList.map((i) => i.to),
      professorOrder: professorList.map((i) => i.to),
    };
    const { error } = await supabase
      .from("system_settings")
      .upsert({ key: PORTAL_NAV_KEY, value: payload as any }, { onConflict: "key" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Portal navigation updated");
    qc.invalidateQueries({ queryKey: ["portal-nav-visibility"] });
    qc.invalidateQueries({ queryKey: ["admin-portal-nav-visibility"] });
  };

  const renderList = (role: "student" | "professor", items: Item[]) => (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd(role)}>
      <SortableContext items={items.map((i) => i.to)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((item) => (
            <SortableRow
              key={item.to}
              item={item}
              visible={isVisible(role, item.to)}
              onToggle={() => !item.locked && toggle(role, item.to)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Portal Navigation</h1>
          <p className="text-sm text-muted-foreground">
            Toggle visibility and drag to reorder the Student and Professor portal links.
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
          <CardContent>{renderList("student", studentList)}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Professor Portal</CardTitle>
          </CardHeader>
          <CardContent>{renderList("professor", professorList)}</CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPortalNav;
