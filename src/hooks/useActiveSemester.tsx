import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActiveSemester {
  id: string;
  name: string;
  year: number;
  semester: number;
  start_date: string;
  end_date: string;
  enrollment_open: boolean;
  enrollment_deadline: string | null;
  is_current: boolean;
  status: string;
}

export const useActiveSemester = () => {
  return useQuery({
    queryKey: ["active-semester"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academic_semesters")
        .select("*")
        .eq("is_current", true)
        .maybeSingle();
      if (error) throw error;
      return data as ActiveSemester | null;
    },
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });
};
