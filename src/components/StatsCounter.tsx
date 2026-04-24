import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Users, GraduationCap, Globe2, Award, BookOpen, Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";

type Stat = {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  suffix?: string;
  label: string;
  description: string;
};

const useCountUp = (end: number, duration = 2000, start = false) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(end * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration, start]);

  return count;
};

const StatCard = ({ stat, index, inView }: { stat: Stat; index: number; inView: boolean }) => {
  const count = useCountUp(stat.value, 1800 + index * 150, inView);
  const Icon = stat.icon;

  const formatted = stat.value >= 1000 ? count.toLocaleString() : count.toString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-7 transition-all duration-500 hover:-translate-y-1 hover:border-accent/40 hover:shadow-2xl hover:shadow-accent/10"
    >
      {/* Glow */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent/10 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative">
        <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/15 to-accent/5 ring-1 ring-accent/20 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
          <Icon className="h-7 w-7 text-accent" />
        </div>

        <div className="font-display text-4xl font-bold leading-none tracking-tight text-foreground md:text-5xl">
          {formatted}
          {stat.suffix && <span className="text-accent">{stat.suffix}</span>}
        </div>

        <p className="mt-3 font-display text-base font-semibold text-foreground">{stat.label}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{stat.description}</p>
      </div>
    </motion.div>
  );
};

const StatsCounter = () => {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const stats: Stat[] = [
    {
      icon: Users,
      value: 12000,
      suffix: "+",
      label: t("statsCounter.studentsLabel", "Active Students"),
      description: t("statsCounter.studentsDesc", "Pursuing their dreams across all faculties"),
    },
    {
      icon: GraduationCap,
      value: 8500,
      suffix: "+",
      label: t("statsCounter.alumniLabel", "Proud Alumni"),
      description: t("statsCounter.alumniDesc", "Leading careers around the world"),
    },
    {
      icon: BookOpen,
      value: 45,
      suffix: "+",
      label: t("statsCounter.programsLabel", "Academic Programs"),
      description: t("statsCounter.programsDesc", "Bachelor, Master & Doctoral degrees"),
    },
    {
      icon: Globe2,
      value: 30,
      suffix: "+",
      label: t("statsCounter.partnersLabel", "Global Partners"),
      description: t("statsCounter.partnersDesc", "Universities & research institutions"),
    },
    {
      icon: Award,
      value: 98,
      suffix: "%",
      label: t("statsCounter.employmentLabel", "Employment Rate"),
      description: t("statsCounter.employmentDesc", "Graduates employed within 6 months"),
    },
    {
      icon: Building2,
      value: 25,
      suffix: "+",
      label: t("statsCounter.yearsLabel", "Years of Excellence"),
      description: t("statsCounter.yearsDesc", "Shaping future leaders since inception"),
    },
  ];

  return (
    <section ref={ref} className="relative section-padding overflow-hidden bg-gradient-to-b from-secondary/30 via-background to-background">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-14 max-w-2xl text-center"
        >
          <span className="mb-4 inline-block rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-accent">
            {t("statsCounter.eyebrow", "By the numbers")}
          </span>
          <h2 className="heading-lg text-foreground">
            {t("statsCounter.title", "A Community That Inspires")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {t(
              "statsCounter.subtitle",
              "Decades of academic excellence, measured in lives transformed and futures built."
            )}
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s, i) => (
            <StatCard key={s.label} stat={s} index={i} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsCounter;
