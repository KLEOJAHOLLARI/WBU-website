import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  ArrowRight,
  Cpu,
  Briefcase,
  Scale,
  Stethoscope,
  Brain,
  BarChart3,
  Building2,
  ShieldCheck,
  FlaskConical,
  HeartPulse,
  Landmark,
  BookOpen,
  Code2,
  Atom,
  GraduationCap,
} from "lucide-react";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const degrees = ["Bachelor", "Master", "PhD"] as const;

// Pick a unique-ish icon based on program title/faculty keywords
const pickIcon = (p: { title: string; faculty?: string | null }) => {
  const t = `${p.title} ${p.faculty ?? ""}`.toLowerCase();
  if (/(ai|artificial|machine|data)/.test(t)) return Brain;
  if (/(computer|software|comput|coding|program)/.test(t)) return Code2;
  if (/(cyber|security)/.test(t)) return ShieldCheck;
  if (/(biotech|biology|bio)/.test(t)) return FlaskConical;
  if (/(medic|nurs|dental|health|pharma)/.test(t)) return Stethoscope;
  if (/(heart|cardio|clinic)/.test(t)) return HeartPulse;
  if (/(law|legal|justice)/.test(t)) return Scale;
  if (/(econom|finance|account|market|analytic)/.test(t)) return BarChart3;
  if (/(business|management|administration|entrepre)/.test(t)) return Briefcase;
  if (/(architect|civil|construct|engineer)/.test(t)) return Building2;
  if (/(physics|chem|science)/.test(t)) return Atom;
  if (/(politic|government|public)/.test(t)) return Landmark;
  if (/(literature|language|art|history|education)/.test(t)) return BookOpen;
  if (/(tech|systems)/.test(t)) return Cpu;
  return GraduationCap;
};

const Programs = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [degree, setDegree] = useState<(typeof degrees)[number]>("Bachelor");

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("*").order("title");
      if (error) throw error;
      return data;
    },
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = { Bachelor: 0, Master: 0, PhD: 0 };
    programs.forEach((p) => {
      if (c[p.degree] !== undefined) c[p.degree]++;
    });
    return c;
  }, [programs]);

  const filtered = programs.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q) ||
      (p.faculty || "").toLowerCase().includes(q);
    const matchesDegree = p.degree === degree;
    return matchesSearch && matchesDegree;
  });

  return (
    <Layout>
      <section className="bg-background">
        <div className="container max-w-4xl px-5 pt-8 pb-16 md:pt-14 md:pb-24">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">
              {t("nav.home", "Home")}
            </Link>
            <span className="mx-2">›</span>
            <span className="text-accent">{t("programs.title", "Programs")}</span>
          </nav>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-display text-4xl font-bold leading-tight text-foreground sm:text-5xl md:text-6xl"
          >
            {degree} <span className="block sm:inline">Programs</span>
          </motion.h1>
          <div className="mt-5 h-1 w-40 rounded-full bg-accent sm:w-56" />

          {/* Degree tabs */}
          <div className="mt-8 flex flex-wrap gap-2">
            {degrees.map((d) => (
              <button
                key={d}
                onClick={() => setDegree(d)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  degree === d
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                }`}
              >
                {d}
                <span className="ml-2 text-xs opacity-70">({counts[d] || 0})</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mt-6">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("programs.searchPlaceholder", "Search programs…")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-border bg-card py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition"
            />
          </div>

          {/* Program list */}
          <div className="mt-8 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
            {isLoading ? (
              <ul className="divide-y divide-border/60">
                {Array.from({ length: 6 }).map((_, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-5"
                  >
                    <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-muted sm:h-16 sm:w-16" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div
                        className="h-4 animate-pulse rounded-md bg-muted"
                        style={{ width: `${55 + ((i * 7) % 35)}%` }}
                      />
                      <div
                        className="h-3 animate-pulse rounded-md bg-muted/70"
                        style={{ width: `${35 + ((i * 5) % 25)}%` }}
                      />
                    </div>
                    <div className="h-5 w-5 shrink-0 animate-pulse rounded bg-muted" />
                  </li>
                ))}
              </ul>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center text-sm text-muted-foreground">
                {t("programs.noResults", "No programs found.")}
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {filtered.map((p, i) => {
                  const Icon = pickIcon(p);
                  return (
                    <motion.li
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: Math.min(i * 0.03, 0.3) }}
                    >
                      <Link
                        to={`/programs/${p.slug}`}
                        className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-accent/5 sm:gap-5 sm:px-6 sm:py-5"
                      >
                        {/* Icon badge */}
                        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent/70 text-accent-foreground shadow-md shadow-accent/20 sm:h-16 sm:w-16">
                          <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.75} />
                        </div>

                        {/* Text */}
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-base font-medium text-foreground transition-colors group-hover:text-accent sm:text-lg">
                            {p.title}
                          </h3>
                          {p.faculty && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
                              {p.faculty} · {p.duration}
                            </p>
                          )}
                        </div>

                        {/* Arrow */}
                        <ArrowRight
                          className="h-5 w-5 shrink-0 text-accent transition-transform duration-200 group-hover:translate-x-1"
                          strokeWidth={2}
                        />
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Programs;
