import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertTriangle, Info, Megaphone, ArrowRight, X } from "lucide-react";

type Announcement = {
  active: boolean;
  variant: "info" | "important" | "warning";
  title: string;
  body: string;
  image_url?: string;
  cta_label?: string;
  cta_url?: string;
  updated_at?: string;
};

const variantStyles = {
  info: { Icon: Info, accent: "bg-primary/10 text-primary", ring: "ring-primary/20" },
  important: { Icon: Megaphone, accent: "bg-accent/15 text-accent", ring: "ring-accent/30" },
  warning: { Icon: AlertTriangle, accent: "bg-destructive/10 text-destructive", ring: "ring-destructive/20" },
};

const STORAGE_KEY = "wbu_homepage_announcement_dismissed";

const HomepageAnnouncementModal = () => {
  const [open, setOpen] = useState(false);

  const { data: ann } = useQuery({
    queryKey: ["homepage-announcement"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "homepage_announcement")
        .maybeSingle();
      return (data?.value as Announcement) || null;
    },
  });

  useEffect(() => {
    if (!ann?.active || !ann?.title) return;
    const version = ann.updated_at || "v1";
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed !== version) {
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [ann]);

  if (!ann?.active || !ann?.title) return null;

  const v = variantStyles[ann.variant || "important"];
  const Icon = v.Icon;

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, ann.updated_at || "v1");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : handleClose())}>
      <DialogContent className="max-w-lg overflow-hidden p-0 gap-0">
        {ann.image_url && (
          <div className="aspect-[16/8] w-full overflow-hidden bg-muted">
            <img src={ann.image_url} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="p-6">
          <div className={`mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${v.accent} ${v.ring}`}>
            <Icon className="h-3.5 w-3.5" />
            {ann.variant === "warning" ? "Important Notice" : ann.variant === "info" ? "Announcement" : "Important"}
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">{ann.title}</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{ann.body}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {ann.cta_url && (
              <a
                href={ann.cta_url}
                target={ann.cta_url.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                onClick={handleClose}
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:shadow-xl"
              >
                {ann.cta_label || "Learn more"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            )}
            <button
              onClick={handleClose}
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" /> Dismiss
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HomepageAnnouncementModal;
