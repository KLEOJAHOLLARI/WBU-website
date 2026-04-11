import { useActiveSemester } from "@/hooks/useActiveSemester";
import { CalendarDays } from "lucide-react";

const SemesterBadge = () => {
  const { data: semester } = useActiveSemester();

  if (!semester) return null;

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm">
      <CalendarDays className="h-3.5 w-3.5 text-primary" />
      <span className="font-medium text-foreground">
        Active: {semester.name}
      </span>
      <span className="text-muted-foreground">
        (Year {semester.year} · Semester {semester.semester})
      </span>
    </div>
  );
};

export default SemesterBadge;
