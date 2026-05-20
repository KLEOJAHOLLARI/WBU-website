import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Users, Globe, Award, ArrowRight, Calendar, Sparkles } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import StudentsCorner from "@/components/StudentsCorner";
import PromoBanners from "@/components/PromoBanners";
import StatsCounter from "@/components/StatsCounter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const stagger = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

const Index = () => {
  const { t } = useTranslation();

  const statItems = [
    { icon: Users, value: "12,000+", label: t("stats.students") },
    { icon: BookOpen, value: "45+", label: t("stats.programs") },
    { icon: Globe, value: "30+", label: t("stats.partners") },
    { icon: Award, value: "98%", label: t("stats.employment") },
  ];

  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("*").order("title").limit(6);
      if (error) throw error;
      return data;
    },
  });

  const { data: news = [] } = useQuery({
    queryKey: ["news-home"],
    queryFn: async () => {
      const { data, error } = await supabase.from("news_articles").select("*").order("published_at", { ascending: false }).limit(3);
      if (error) throw error;
      return data;
    },
  });

  const { data: heroMedia } = useQuery({
    queryKey: ["hero-media-public"],
    queryFn: async () => {
      const { data } = await supabase.from("system_settings").select("value").eq("key", "hero_media").maybeSingle();
      return (data?.value as { type: "image" | "video"; url: string }) || null;
    },
  });

  const heroUrl = heroMedia?.url || "https://images.unsplash.com/photo-1562774053-701939374585?w=1920&q=80";
  const heroIsVideo = heroMedia?.type === "video" && !!heroMedia.url;

  return (
    <Layout>
      {/* Hero — full-bleed with background image + dark overlay */}
      <section className="relative min-h-[100vh] flex items-center overflow-hidden">
        {/* Background image or video */}
        {heroIsVideo ? (
          <video
            src={heroUrl}
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <img
            src={heroUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {/* Dark gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/60 to-primary/70" />

        {/* Ambient glow shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-accent/10 blur-3xl animate-float" />
          <div className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-accent/5 blur-3xl" />
        </div>

        <div className="container relative z-10 py-32 md:py-40">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-foreground/15 bg-primary-foreground/5 px-4 py-1.5 backdrop-blur-sm"
            >
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/80">{t("hero.tagline")}</span>
            </motion.div>

            <h1 className="heading-xl text-primary-foreground">
              {t("hero.title")}{" "}
              <span className="bg-gradient-to-r from-accent to-accent/80 bg-clip-text text-transparent">
                {t("hero.titleHighlight")}
              </span>{" "}
              {t("hero.titleEnd")}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-6 max-w-xl text-lg leading-relaxed text-primary-foreground/70"
            >
              {t("hero.subtitle")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <Link
                to="/programs"
                className="group inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 font-semibold text-accent-foreground shadow-xl shadow-accent/25 transition-all duration-300 hover:shadow-2xl hover:shadow-accent/35 hover:scale-105"
              >
                {t("hero.explorePrograms")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/admissions"
                className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 px-7 py-3.5 font-semibold text-primary-foreground backdrop-blur-sm transition-all duration-300 hover:bg-primary-foreground/10 hover:border-primary-foreground/30"
              >
                {t("hero.applyNow")}
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Stats */}
      <section className="-mt-16 relative z-20">
        <div className="container">
          <div className="grid grid-cols-2 gap-4 rounded-2xl bg-card p-8 shadow-xl ring-1 ring-border/50 md:grid-cols-4 md:gap-6 md:p-10">
            {statItems.map((s, i) => (
              <motion.div key={s.label} {...stagger} transition={{ duration: 0.5, delay: i * 0.1 }} className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                  <s.icon className="h-6 w-6 text-accent" />
                </div>
                <p className="font-display text-3xl font-bold text-foreground md:text-4xl">{s.value}</p>
                <p className="mt-1 text-sm font-medium text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Programs */}
      <section className="section-padding">
        <div className="container">
          <SectionHeading title={t("home.ourPrograms")} subtitle={t("home.ourProgramsSub")} />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((p, i) => (
              <motion.div key={p.id} {...stagger} transition={{ duration: 0.5, delay: i * 0.08 }}>
                <Link to={`/programs/${p.slug}`} className="glass-card group flex h-full flex-col p-7">
                  <span className="mb-3 inline-block self-start rounded-full bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent">{p.degree}</span>
                  <h3 className="font-display text-xl font-semibold text-foreground transition-colors group-hover:text-primary">{p.title}</h3>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">{p.faculty}</p>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground/80">{p.description}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-all group-hover:gap-2.5">
                    {t("home.learnMore")} <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
          <motion.div {...fadeUp} className="mt-12 text-center">
            <Link to="/programs" className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 font-semibold text-primary-foreground shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105">
              {t("home.viewAllPrograms")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section-padding bg-secondary/50">
        <div className="container">
          <SectionHeading title={t("home.whyWBU")} subtitle={t("home.whyWBUSub")} />
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { title: t("home.researchDriven"), desc: t("home.researchDrivenDesc"), icon: Sparkles },
              { title: t("home.globalNetwork"), desc: t("home.globalNetworkDesc"), icon: Globe },
              { title: t("home.careerReady"), desc: t("home.careerReadyDesc"), icon: Award },
            ].map((item, i) => (
              <motion.div key={i} {...stagger} transition={{ duration: 0.5, delay: i * 0.1 }} className="glass-card p-8">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                  <item.icon className="h-7 w-7 text-accent" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Animated Stats Counter */}
      <StatsCounter />

      {/* Student's Corner */}
      <StudentsCorner />

      {/* Promotional Banners (admin-managed) */}
      <PromoBanners />

      {/* Latest News */}
      <section className="section-padding">
        <div className="container">
          <SectionHeading title={t("home.latestNews")} subtitle={t("home.latestNewsSub")} />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {news.map((a, i) => (
              <motion.div key={a.id} {...stagger} transition={{ duration: 0.5, delay: i * 0.1 }}>
                <Link to={`/news/${a.slug}`} className="glass-card group flex h-full flex-col overflow-hidden">
                  {a.image_url && (
                    <div className="aspect-video overflow-hidden">
                      <img src={a.image_url} alt={a.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-6">
                    <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(a.published_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                      <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">{a.category}</span>
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground transition-colors group-hover:text-primary">{a.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{a.excerpt}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
          <motion.div {...fadeUp} className="mt-12 text-center">
            <Link to="/news" className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-all hover:gap-3">
              {t("home.viewAllNews")} <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-primary py-24 text-primary-foreground md:py-32">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 top-0 h-80 w-80 rounded-full bg-accent/8 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />
        </div>
        <div className="container relative z-10 text-center">
          <motion.div {...fadeUp}>
            <h2 className="heading-lg">{t("home.readyTitle")}</h2>
            <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-primary-foreground/70">{t("home.readySub")}</p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link to="/admissions" className="group inline-flex items-center gap-2 rounded-full bg-accent px-8 py-4 font-semibold text-accent-foreground shadow-xl shadow-accent/25 transition-all duration-300 hover:shadow-2xl hover:shadow-accent/35 hover:scale-105">
                {t("hero.applyNow")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link to="/contact" className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 px-8 py-4 font-semibold transition-all duration-300 hover:bg-primary-foreground/10">{t("home.contactUs")}</Link>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
