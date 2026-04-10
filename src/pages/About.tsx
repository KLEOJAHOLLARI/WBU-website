import { motion } from "framer-motion";
import { Target, Eye, Users, Award, BookOpen, Globe } from "lucide-react";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import SectionHeading from "@/components/SectionHeading";
import { useTranslation } from "react-i18next";

const stagger = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
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
        <div className="container grid gap-14 lg:grid-cols-2 lg:items-center">
          <motion.div {...stagger} transition={{ duration: 0.6 }}>
            <h2 className="heading-lg text-foreground">{t("about.builtForFuture")}</h2>
            <div className="mt-5 h-1 w-16 rounded-full bg-accent" />
            <p className="mt-7 text-base leading-relaxed text-muted-foreground">{t("about.overview1")}</p>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">{t("about.overview2")}</p>
          </motion.div>
          <motion.div {...stagger} transition={{ duration: 0.6, delay: 0.2 }}>
            <img src="https://images.unsplash.com/photo-1562774053-701939374585?w=800&q=80" alt="University campus" className="rounded-2xl shadow-xl ring-1 ring-border/50" loading="lazy" />
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-secondary/50">
        <div className="container grid gap-6 md:grid-cols-2">
          <motion.div {...stagger} transition={{ duration: 0.5 }} className="glass-card p-8">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
              <Target className="h-7 w-7 text-accent" />
            </div>
            <h3 className="font-display text-2xl font-semibold text-foreground">{t("about.mission")}</h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">{t("about.missionText")}</p>
          </motion.div>
          <motion.div {...stagger} transition={{ duration: 0.5, delay: 0.15 }} className="glass-card p-8">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
              <Eye className="h-7 w-7 text-accent" />
            </div>
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
              <motion.div key={i} {...stagger} transition={{ duration: 0.5, delay: i * 0.1 }} className="glass-card p-7 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                  <v.icon className="h-7 w-7 text-accent" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-secondary/50">
        <div className="container">
          <SectionHeading title={t("about.leadership")} subtitle={t("about.leadershipSub")} />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {leadership.map((p, i) => (
              <motion.div key={p.name} {...stagger} transition={{ duration: 0.5, delay: i * 0.1 }} className="glass-card overflow-hidden">
                <div className="aspect-[3/4] overflow-hidden">
                  <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" loading="lazy" />
                </div>
                <div className="p-5 text-center">
                  <h3 className="font-display text-base font-semibold text-foreground">{p.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.role}</p>
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
