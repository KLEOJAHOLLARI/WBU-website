import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GradeDisplayMode } from "@/lib/grading";

interface Props {
  value: GradeDisplayMode;
  onChange: (mode: GradeDisplayMode) => void;
  className?: string;
}

/**
 * Compact 3-way toggle controlling how transcript grades are rendered:
 *   %  ·  Albanian  ·  Full (% → Albanian + letter)
 */
const GradeDisplayToggle = ({ value, onChange, className }: Props) => (
  <Tabs
    value={value}
    onValueChange={(v) => onChange(v as GradeDisplayMode)}
    className={className}
  >
    <TabsList className="h-9">
      <TabsTrigger value="percent" className="text-xs px-3">%</TabsTrigger>
      <TabsTrigger value="albanian" className="text-xs px-3">Albanian</TabsTrigger>
      <TabsTrigger value="full" className="text-xs px-3">% + Albanian + Letter</TabsTrigger>
    </TabsList>
  </Tabs>
);

export default GradeDisplayToggle;
