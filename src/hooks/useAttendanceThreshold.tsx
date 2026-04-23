import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_ATTENDANCE_THRESHOLD } from "@/lib/attendance";

export const useAttendanceThreshold = () => {
  const { data } = useQuery({
    queryKey: ["system-setting", "attendance_threshold"],
    queryFn: async (): Promise<number> => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "attendance_threshold")
        .maybeSingle();
      const v = (data?.value as { percent?: number } | null)?.percent;
      return typeof v === "number" && v > 0 && v <= 100 ? v : DEFAULT_ATTENDANCE_THRESHOLD;
    },
    staleTime: 5 * 60 * 1000,
  });
  return data ?? DEFAULT_ATTENDANCE_THRESHOLD;
};
