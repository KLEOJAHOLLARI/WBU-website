import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { PORTAL_NAV_KEY, NavVisibility } from "@/hooks/usePortalNavVisibility";
import {
  PORTAL_NAV_STYLE_KEY, DEFAULT_STYLE, ALL_ACCENTS, ACCENT_HEX,
  type Accent, type IconStyle, type PortalNavStyle,
} from "@/hooks/usePortalNavStyle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GripVertical, Check } from "lucide-react";
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
  { to: "/portal/discussions", label: "Discussions" },
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
  { to: "/professor/discussions", label: "Discussions" },
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

const ColorPicker = ({ value, onChange }: { value: Accent; onChange: (a: Accent) => void }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        type="button"
        className="h-6 w-6 shrink-0 rounded-md ring-1 ring-border transition hover:scale-110"
        style={{ backgroundColor: ACCENT_HEX[value] }}
        aria-label="Choose color"
      />
    </PopoverTrigger>
    <PopoverContent className="w-auto p-2">
      <div className="grid grid-cols-8 gap-1.5">
        {ALL_ACCENTS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onChange(a)}
            className="relative h-6 w-6 rounded-md ring-1 ring-border transition hover:scale-110"
            style={{ backgroundColor: ACCENT_HEX[a] }}
            aria-label={a}
          >
            {a === value && <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />}
          </button>
        ))}
      </div>
    </PopoverContent>
  </Popover>
);

const SortableRow = ({
  item,
  visible,
  onToggle,
  accent,
  onAccent,
}: {
  item: Item;
  visible: boolean;
  onToggle: () => void;
  accent: Accent;
  onAccent: (a: Accent) => void;
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
      <ColorPicker value={accent} onChange={onAccent} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
        <p className="text-xs text-muted-foreground truncate">{item.to}</p>
      </div>
      <Switch checked={visible} disabled={item.locked} onCheckedChange={onToggle} />
    </div>
  );
};

const ICON_STYLES: { value: IconStyle; label: string; desc: string }[] = [
  { value: "tile", label: "Soft Tile", desc: "Rounded tinted square (default)" },
  { value: "gradient", label: "Gradient", desc: "Vibrant gradient tile" },
  { value: "outline", label: "Outline", desc: "Transparent with colored border" },
  { value: "plain", label: "Plain", desc: "Colored icon only" },
];

const AdminPortalNav = () => {
  const qc = useQueryClient();
  const [value, setValue] = useState<NavVisibility>({ student: {}, professor: {} });
  const [styleVal, setStyleVal] = useState<PortalNavStyle>(DEFAULT_STYLE);
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
      const [vis, sty] = await Promise.all([
        supabase.from("system_settings").select("value").eq("key", PORTAL_NAV_KEY).maybeSingle(),
        supabase.from("system_settings").select("value").eq("key", PORTAL_NAV_STYLE_KEY).maybeSingle(),
      ]);
      return {
        vis: (vis.data?.value as NavVisibility | null) || { student: {}, professor: {} },
        sty: (sty.data?.value as PortalNavStyle | null) || null,
      };
    },
  });

  useEffect(() => {
    if (data) {
      setValue(data.vis);
      setStudentList(applyOrder(studentItems, data.vis.studentOrder));
      setProfessorList(applyOrder(professorItems, data.vis.professorOrder));
      setStyleVal({
        iconStyle: data.sty?.iconStyle || DEFAULT_STYLE.iconStyle,
        studentAccents: { ...DEFAULT_STYLE.studentAccents, ...(data.sty?.studentAccents || {}) },
        professorAccents: { ...DEFAULT_STYLE.professorAccents, ...(data.sty?.professorAccents || {}) },
      });
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

  const accentFor = (role: "student" | "professor", to: string): Accent => {
    const map = role === "student" ? styleVal.studentAccents : styleVal.professorAccents;
    return (map?.[to] as Accent) || "slate";
  };

  const setAccent = (role: "student" | "professor", to: string, a: Accent) => {
    setStyleVal((s) => ({
      ...s,
      [role === "student" ? "studentAccents" : "professorAccents"]: {
        ...(role === "student" ? s.studentAccents : s.professorAccents),
        [to]: a,
      },
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
    const visPayload: NavVisibility = {
      ...value,
      studentOrder: studentList.map((i) => i.to),
      professorOrder: professorList.map((i) => i.to),
    };
    const [r1, r2] = await Promise.all([
      supabase.from("system_settings").upsert({ key: PORTAL_NAV_KEY, value: visPayload as any }, { onConflict: "key" }),
      supabase.from("system_settings").upsert({ key: PORTAL_NAV_STYLE_KEY, value: styleVal as any }, { onConflict: "key" }),
    ]);
    setSaving(false);
    if (r1.error || r2.error) return toast.error(r1.error?.message || r2.error?.message || "Save failed");
    toast.success("Portal navigation updated");
    qc.invalidateQueries({ queryKey: ["portal-nav-visibility"] });
    qc.invalidateQueries({ queryKey: ["portal-nav-style"] });
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
              accent={accentFor(role, item.to)}
              onAccent={(a) => setAccent(role, item.to, a)}
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
            Choose icon style, pick per-link colors, toggle visibility, and reorder.
          </p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Icon Style</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {ICON_STYLES.map((opt) => {
              const selected = styleVal.iconStyle === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStyleVal((s) => ({ ...s, iconStyle: opt.value }))}
                  className={`rounded-xl border p-3 text-left transition ${
                    selected ? "border-primary bg-primary/5 ring-2 ring-primary/40" : "border-border hover:bg-muted"
                  }`}
                >
                  <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
