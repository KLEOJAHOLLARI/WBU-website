import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PortalRole = "student" | "professor";
export type NavVisibility = {
  student: Record<string, boolean>;
  professor: Record<string, boolean>;
  studentOrder?: string[];
  professorOrder?: string[];
};

export const PORTAL_NAV_KEY = "portal_nav_visibility";

export const usePortalNavConfig = () => {
  return useQuery({
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
};

export const usePortalNavVisibility = (role: PortalRole) => {
  const { data } = usePortalNavConfig();
  return (path: string) => data?.[role]?.[path] !== false;
};

export const usePortalNavOrder = (role: PortalRole) => {
  const { data } = usePortalNavConfig();
  const order = role === "student" ? data?.studentOrder : data?.professorOrder;
  return (paths: string[]) => {
    if (!order || order.length === 0) return paths;
    const indexOf = (p: string) => {
      const i = order.indexOf(p);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    return [...paths].sort((a, b) => indexOf(a) - indexOf(b));
  };
};
