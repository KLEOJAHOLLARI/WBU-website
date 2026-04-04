import { motion } from "framer-motion";
import { Target, Eye, Users, Award, BookOpen, Globe } from "lucide-react";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import SectionHeading from "@/components/SectionHeading";
import { useTranslation } from "react-i18next";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const About = () => {
  const { t } = useTranslation();

  const leadership = [
    { name: "Prof. Dr. Arben Kola", role: t("about.rector"), image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&q=80" },
    { name: "Prof. Dr. Elira Hoxha", role: t("about.viceRectorAcademic"), image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&q=80" },
    { name: "Dr. Genti Basha", role: t("about.viceRectorResearch"), image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&q=80" },
    { name: "Dr. Mirela Shehu", role: t("about.deanStudents"), image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&q=80" },
  ];

  const values = [
    { icon: BookOpen, title: t("about.academicExcellence"), desc: t("about.academicExcellenceDesc") },
    { icon: Users, title: t("about.inclusivity"), desc: t("about.inclusivityDesc") },
    { icon: Globe, title: t("about.globalPerspective"), desc: t("about.globalPerspectiveDesc") },
    { icon: Award, title: t("about.integrity"), desc: t("about.integrityDesc") },
  ];

  return (
    <Layout>
      <PageHero title={t("about.title")} subtitle={t("about.subtitle")} />

      <section className="section-padding">
        <div className="container grid gap-12 lg:grid-cols-2 lg:items-center">
          <motion.div {...fadeUp}>
            <h2 className="heading-lg text-foreground">{t("about.builtForFuture")}</h2>
            <div className="mt-4 h-1 w-16 rounded-full bg-accent" />
            <p className="mt-6 leading-relaxed text-muted-foreground">{t("about.overview1")}</p>
            <p className="mt-4 leading-relaxed text-muted-foreground">{t("about.overview2")}</p>
          </motion.div>
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }}>
            <img src="https://images.unsplash.com/photo-1562774053-701939374585?w=800&q=80" alt="University campus" className="rounded-xl shadow-lg" loading="lazy" />
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-secondary">
        <div className="container grid gap-8 md:grid-cols-2">
          <motion.div {...fadeUp} className="rounded-xl bg-card p-8 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/15"><Target className="h-6 w-6 text-accent" /></div>
            <h3 className="font-display text-2xl font-semibold text-foreground">{t("about.mission")}</h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">{t("about.missionText")}</p>
          </motion.div>
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }} className="rounded-xl bg-card p-8 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/15"><Eye className="h-6 w-6 text-accent" /></div>
            <h3 className="font-display text-2xl font-semibold text-foreground">{t("about.vision")}</h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">{t("about.visionText")}</p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container">
          <SectionHeading title={t("about.coreValues")} />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v, i) => (
              <motion.div key={i} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.1 }} className="rounded-xl border border-border bg-card p-6 text-center">
                <v.icon className="mx-auto mb-3 h-8 w-8 text-accent" />
                <h3 className="font-display text-lg font-semibold text-foreground">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-secondary">
        <div className="container">
          <SectionHeading title={t("about.leadership")} subtitle={t("about.leadershipSub")} />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {leadership.map((p, i) => (
              <motion.div key={p.name} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.1 }} className="overflow-hidden rounded-xl bg-card shadow-sm">
                <div className="aspect-[3/4] overflow-hidden">
                  <img src={p.image} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div className="p-4 text-center">
                  <h3 className="font-display text-base font-semibold text-foreground">{p.name}</h3>
                  <p className="text-sm text-muted-foreground">{p.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
