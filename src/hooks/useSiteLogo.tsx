import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import defaultLogo from "@/assets/wbu-logo.png";

export const SITE_LOGO_KEY = "site_logo";

export type SiteLogoValue = { url?: string | null };

export const useSiteLogo = () => {
  const { data } = useQuery({
    queryKey: ["site-logo"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", SITE_LOGO_KEY)
        .maybeSingle();
      return (data?.value as SiteLogoValue | null) || null;
    },
    staleTime: 60_000,
  });
  return data?.url || defaultLogo;
};
