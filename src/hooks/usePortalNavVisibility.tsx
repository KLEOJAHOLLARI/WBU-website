import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PortalRole = "student" | "professor";
export type NavVisibility = { student: Record<string, boolean>; professor: Record<string, boolean> };

export const PORTAL_NAV_KEY = "portal_nav_visibility";

export const usePortalNavVisibility = (role: PortalRole) => {
  const { data } = useQuery({
    queryKey: ["portal-nav-visibility"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", PORTAL_NAV_KEY)
        .maybeSingle();
      return (data?.value as NavVisibility | null) || null;
    },
    staleTime: 60_000,
  });

  // Default: everything visible. Only hide when explicitly set to false.
  return (path: string) => data?.[role]?.[path] !== false;
};
