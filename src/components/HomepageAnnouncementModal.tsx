import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertTriangle, Info, Megaphone, ArrowRight, X, Sparkles } from "lucide-react";

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

const variantConfig = {
  info: {
    Icon: Info,
    label: "Announcement",
    gradient: "from-sky-500 via-blue-500 to-indigo-600",
    glow: "shadow-[0_0_60px_-15px_rgba(59,130,246,0.6)]",
    chipBg: "bg-sky-500/15 text-sky-600 ring-sky-500/30",
    orb: "bg-sky-400/40",
  },
  important: {
    Icon: Megaphone,
    label: "Important",
    gradient: "from-primary via-accent to-primary",
    glow: "shadow-[0_0_60px_-15px_hsl(var(--primary)/0.7)]",
    chipBg: "bg-primary/15 text-primary ring-primary/30",
    orb: "bg-primary/40",
  },
  warning: {
    Icon: AlertTriangle,
    label: "Important Notice",
    gradient: "from-amber-500 via-orange-500 to-rose-600",
    glow: "shadow-[0_0_60px_-15px_rgba(244,114,82,0.6)]",
    chipBg: "bg-amber-500/15 text-amber-600 ring-amber-500/30",
    orb: "bg-orange-400/40",
  },
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
      const t = setTimeout(() => setOpen(true), 700);
      return () => clearTimeout(t);
    }
  }, [ann]);

  if (!ann?.active || !ann?.title) return null;

  const cfg = variantConfig[ann.variant || "important"];
  const Icon = cfg.Icon;

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, ann.updated_at || "v1");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : handleClose())}>
      <DialogContent
        className={`max-w-xl overflow-hidden border-0 p-0 gap-0 rounded-2xl bg-card ${cfg.glow} duration-500 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-8`}
      >
        {/* Animated gradient border */}
        <div className={`absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br ${cfg.gradient} opacity-90 blur-2xl`} />

        {/* Top gradient bar */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${cfg.gradient}`} />

        {/* Hero / image area */}
        <div className="relative overflow-hidden">
          {ann.image_url ? (
            <div className="relative aspect-[16/7] w-full overflow-hidden bg-muted">
              <img
                src={ann.image_url}
                alt=""
                className="h-full w-full object-cover animate-in fade-in zoom-in-105 duration-[1200ms]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
              <div className={`absolute -bottom-10 -right-10 h-40 w-40 rounded-full blur-3xl ${cfg.orb} animate-pulse`} />
            </div>
          ) : (
            <div className={`relative h-28 w-full overflow-hidden bg-gradient-to-br ${cfg.gradient}`}>
              <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_30%,white_0,transparent_40%),radial-gradient(circle_at_80%_70%,white_0,transparent_40%)]" />
              <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/20 blur-2xl animate-pulse" />
              <div className="absolute -top-6 -left-6 h-24 w-24 rounded-full bg-white/20 blur-2xl animate-pulse [animation-delay:1s]" />
            </div>
          )}

          {/* Floating icon badge */}
          <div className="absolute left-6 -bottom-7 z-10">
            <div className={`relative flex h-14 w-14 items-center justify-center rounded-2xl bg-card ring-1 ring-border shadow-xl`}>
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${cfg.gradient} opacity-20`} />
              <Icon className={`relative h-7 w-7 ${cfg.chipBg.split(' ')[1]}`} />
              <Sparkles className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 text-accent animate-pulse" />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-7 pt-12 pb-7">
          <div className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ${cfg.chipBg} animate-in fade-in slide-in-from-left-2 duration-700`}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
            </span>
            {cfg.label}
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground animate-in fade-in slide-in-from-bottom-2 duration-700">
            {ann.title}
          </h2>

          <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground animate-in fade-in slide-in-from-bottom-3 duration-700 [animation-delay:120ms] fill-mode-both">
            {ann.body}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 [animation-delay:220ms] fill-mode-both">
            {ann.cta_url && (
              <a
                href={ann.cta_url}
                target={ann.cta_url.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                onClick={handleClose}
                className={`group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r ${cfg.gradient} px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.03] hover:shadow-2xl`}
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative">{ann.cta_label || "Learn more"}</span>
                <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            )}
            <button
              onClick={handleClose}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background/50 px-5 py-3 text-sm font-medium text-muted-foreground backdrop-blur transition-all hover:bg-muted hover:text-foreground"
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
