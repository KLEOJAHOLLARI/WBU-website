import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ComponentType } from "react";

export const PORTAL_NAV_STYLE_KEY = "portal_nav_style";

export type Accent =
  | "emerald" | "sky" | "amber" | "violet" | "rose" | "cyan"
  | "indigo" | "orange" | "teal" | "pink" | "lime" | "fuchsia"
  | "slate" | "red" | "yellow" | "blue";

export type IconStyle = "tile" | "plain" | "outline" | "gradient";

export type PortalNavStyle = {
  iconStyle: IconStyle;
  studentAccents?: Record<string, Accent>;
  professorAccents?: Record<string, Accent>;
};

export const ALL_ACCENTS: Accent[] = [
  "emerald", "sky", "amber", "violet", "rose", "cyan",
  "indigo", "orange", "teal", "pink", "lime", "fuchsia",
  "slate", "red", "yellow", "blue",
];

export const ACCENT_HEX: Record<Accent, string> = {
  emerald: "#10b981", sky: "#0ea5e9", amber: "#f59e0b", violet: "#8b5cf6",
  rose: "#f43f5e", cyan: "#06b6d4", indigo: "#6366f1", orange: "#f97316",
  teal: "#14b8a6", pink: "#ec4899", lime: "#84cc16", fuchsia: "#d946ef",
  slate: "#64748b", red: "#ef4444", yellow: "#eab308", blue: "#3b82f6",
};

const TILE: Record<Accent, string> = {
  emerald: "bg-emerald-500/15 text-emerald-500 ring-emerald-500/30",
  sky:     "bg-sky-500/15 text-sky-500 ring-sky-500/30",
  amber:   "bg-amber-500/15 text-amber-500 ring-amber-500/30",
  violet:  "bg-violet-500/15 text-violet-500 ring-violet-500/30",
  rose:    "bg-rose-500/15 text-rose-500 ring-rose-500/30",
  cyan:    "bg-cyan-500/15 text-cyan-500 ring-cyan-500/30",
  indigo:  "bg-indigo-500/15 text-indigo-500 ring-indigo-500/30",
  orange:  "bg-orange-500/15 text-orange-500 ring-orange-500/30",
  teal:    "bg-teal-500/15 text-teal-500 ring-teal-500/30",
  pink:    "bg-pink-500/15 text-pink-500 ring-pink-500/30",
  lime:    "bg-lime-500/15 text-lime-500 ring-lime-500/30",
  fuchsia: "bg-fuchsia-500/15 text-fuchsia-500 ring-fuchsia-500/30",
  slate:   "bg-slate-500/15 text-slate-500 ring-slate-500/30",
  red:     "bg-red-500/15 text-red-500 ring-red-500/30",
  yellow:  "bg-yellow-500/15 text-yellow-500 ring-yellow-500/30",
  blue:    "bg-blue-500/15 text-blue-500 ring-blue-500/30",
};

const SOLID_TEXT: Record<Accent, string> = {
  emerald: "text-emerald-500", sky: "text-sky-500", amber: "text-amber-500",
  violet: "text-violet-500", rose: "text-rose-500", cyan: "text-cyan-500",
  indigo: "text-indigo-500", orange: "text-orange-500", teal: "text-teal-500",
  pink: "text-pink-500", lime: "text-lime-500", fuchsia: "text-fuchsia-500",
  slate: "text-slate-500", red: "text-red-500", yellow: "text-yellow-500",
  blue: "text-blue-500",
};

const OUTLINE: Record<Accent, string> = {
  emerald: "text-emerald-500 ring-emerald-500/50",
  sky:     "text-sky-500 ring-sky-500/50",
  amber:   "text-amber-500 ring-amber-500/50",
  violet:  "text-violet-500 ring-violet-500/50",
  rose:    "text-rose-500 ring-rose-500/50",
  cyan:    "text-cyan-500 ring-cyan-500/50",
  indigo:  "text-indigo-500 ring-indigo-500/50",
  orange:  "text-orange-500 ring-orange-500/50",
  teal:    "text-teal-500 ring-teal-500/50",
  pink:    "text-pink-500 ring-pink-500/50",
  lime:    "text-lime-500 ring-lime-500/50",
  fuchsia: "text-fuchsia-500 ring-fuchsia-500/50",
  slate:   "text-slate-500 ring-slate-500/50",
  red:     "text-red-500 ring-red-500/50",
  yellow:  "text-yellow-500 ring-yellow-500/50",
  blue:    "text-blue-500 ring-blue-500/50",
};

const GRADIENT: Record<Accent, string> = {
  emerald: "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-500/30",
  sky:     "bg-gradient-to-br from-sky-400 to-sky-600 text-white shadow-sky-500/30",
  amber:   "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-500/30",
  violet:  "bg-gradient-to-br from-violet-400 to-violet-600 text-white shadow-violet-500/30",
  rose:    "bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-rose-500/30",
  cyan:    "bg-gradient-to-br from-cyan-400 to-cyan-600 text-white shadow-cyan-500/30",
  indigo:  "bg-gradient-to-br from-indigo-400 to-indigo-600 text-white shadow-indigo-500/30",
  orange:  "bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-orange-500/30",
  teal:    "bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-teal-500/30",
  pink:    "bg-gradient-to-br from-pink-400 to-pink-600 text-white shadow-pink-500/30",
  lime:    "bg-gradient-to-br from-lime-400 to-lime-600 text-white shadow-lime-500/30",
  fuchsia: "bg-gradient-to-br from-fuchsia-400 to-fuchsia-600 text-white shadow-fuchsia-500/30",
  slate:   "bg-gradient-to-br from-slate-400 to-slate-600 text-white shadow-slate-500/30",
  red:     "bg-gradient-to-br from-red-400 to-red-600 text-white shadow-red-500/30",
  yellow:  "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-yellow-500/30",
  blue:    "bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-blue-500/30",
};

export const DEFAULT_STYLE: PortalNavStyle = {
  iconStyle: "tile",
  studentAccents: {
    "/portal": "sky",
    "/portal/courses": "violet",
    "/portal/assignments": "amber",
    "/portal/discussions": "cyan",
    "/portal/seating": "teal",
    "/portal/office-hours": "indigo",
    "/portal/events": "pink",
    "/portal/internships": "orange",
    "/portal/registration": "emerald",
    "/portal/retake": "rose",
    "/portal/resits": "fuchsia",
    "/portal/transcript": "indigo",
    "/portal/timetable": "cyan",
    "/portal/exams": "amber",
    "/portal/tuition": "emerald",
    "/portal/tuition/estimate": "lime",
    "/portal/documents": "sky",
    "/portal/feedback": "amber",
    "/portal/id-card": "violet",
    "/portal/access-history": "teal",
    "/portal/messages": "rose",
    "/portal/notifications": "orange",
    "/portal/profile": "pink",
  },
  professorAccents: {
    "/professor": "sky",
    "/professor/courses": "violet",
    "/professor/assignments": "amber",
    "/professor/discussions": "cyan",
    "/professor/seating": "teal",
    "/professor/office-hours": "indigo",
    "/professor/advisor": "emerald",
    "/professor/transcripts": "indigo",
    "/professor/exams": "amber",
    "/professor/resits": "fuchsia",
    "/professor/announcements": "orange",
    "/professor/performance": "yellow",
    "/professor/id-card": "violet",
    "/professor/profile": "pink",
  },
};

export const usePortalNavStyle = () =>
  useQuery({
    queryKey: ["portal-nav-style"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", PORTAL_NAV_STYLE_KEY)
        .maybeSingle();
      const merged: PortalNavStyle = {
        ...DEFAULT_STYLE,
        ...((data?.value as PortalNavStyle | null) || {}),
      };
      merged.studentAccents = { ...DEFAULT_STYLE.studentAccents, ...(merged.studentAccents || {}) };
      merged.professorAccents = { ...DEFAULT_STYLE.professorAccents, ...(merged.professorAccents || {}) };
      return merged;
    },
    staleTime: 60_000,
  });

export const NavIcon = ({
  icon: Icon,
  accent,
  style,
  active,
}: {
  icon: ComponentType<{ className?: string }>;
  accent: Accent;
  style: IconStyle;
  active?: boolean;
}) => {
  if (style === "plain") {
    return <Icon className={`h-4 w-4 shrink-0 ${SOLID_TEXT[accent]} ${active ? "opacity-100" : "opacity-80 group-hover:opacity-100"}`} />;
  }
  if (style === "outline") {
    return (
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-transparent ring-1 ring-inset ${OUTLINE[accent]}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (style === "gradient") {
    return (
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm ${GRADIENT[accent]}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
    );
  }
  // tile (default)
  return (
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset transition-transform group-hover:scale-105 ${TILE[accent]}`}>
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
};
