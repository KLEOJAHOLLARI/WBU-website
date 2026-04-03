import { motion } from "framer-motion";
import { Target, Eye, Users, Award, BookOpen, Globe } from "lucide-react";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import SectionHeading from "@/components/SectionHeading";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const leadership = [
  { name: "Prof. Dr. Arben Kola", role: "Rector", image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&q=80" },
  { name: "Prof. Dr. Elira Hoxha", role: "Vice Rector for Academic Affairs", image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&q=80" },
  { name: "Dr. Genti Basha", role: "Vice Rector for Research", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&q=80" },
  { name: "Dr. Mirela Shehu", role: "Dean of Students", image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&q=80" },
];

const About = () => (
  <Layout>
    <PageHero
      title="About Akademia"
      subtitle="A legacy of academic excellence, innovation, and community since 1998"
    />

    {/* Overview */}
    <section className="section-padding">
      <div className="container grid gap-12 lg:grid-cols-2 lg:items-center">
        <motion.div {...fadeUp}>
          <h2 className="heading-lg text-foreground">A University Built for the Future</h2>
          <div className="mt-4 h-1 w-16 rounded-full bg-accent" />
          <p className="mt-6 leading-relaxed text-muted-foreground">
            Founded in 1998, Akademia University has grown from a small institution with a bold vision
            into one of the most respected universities in the region. With five faculties, over 45
            study programs, and a vibrant community of 12,000 students, we are committed to fostering
            critical thinking, creativity, and social responsibility.
          </p>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Our campus is a hub of intellectual discovery where students, faculty, and researchers
            collaborate on projects that address real-world challenges — from sustainable energy to
            public health innovation. We believe education should not only open doors but also
            empower individuals to create new ones.
          </p>
        </motion.div>
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }}>
          <img
            src="https://images.unsplash.com/photo-1562774053-701939374585?w=800&q=80"
            alt="University campus"
            className="rounded-xl shadow-lg"
            loading="lazy"
          />
        </motion.div>
      </div>
    </section>

    {/* Mission & Vision */}
    <section className="section-padding bg-secondary">
      <div className="container grid gap-8 md:grid-cols-2">
        <motion.div
          {...fadeUp}
          className="rounded-xl bg-card p-8 shadow-sm"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/15">
            <Target className="h-6 w-6 text-accent" />
          </div>
          <h3 className="font-display text-2xl font-semibold text-foreground">Our Mission</h3>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            To provide transformative education that equips students with the knowledge, skills, and
            values needed to lead meaningful lives and contribute to society. We are dedicated to
            advancing knowledge through research, fostering innovation, and nurturing a diverse and
            inclusive academic community.
          </p>
        </motion.div>
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.15 }}
          className="rounded-xl bg-card p-8 shadow-sm"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/15">
            <Eye className="h-6 w-6 text-accent" />
          </div>
          <h3 className="font-display text-2xl font-semibold text-foreground">Our Vision</h3>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            To be recognized as a leading university in Southeast Europe — a center of academic
            excellence, groundbreaking research, and positive social impact. We envision graduates
            who are globally competitive, ethically grounded, and equipped to shape a more just and
            sustainable world.
          </p>
        </motion.div>
      </div>
    </section>

    {/* Values */}
    <section className="section-padding">
      <div className="container">
        <SectionHeading title="Our Core Values" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: BookOpen, title: "Academic Excellence", desc: "Rigorous standards and continuous pursuit of knowledge." },
            { icon: Users, title: "Inclusivity", desc: "A welcoming environment for students of all backgrounds." },
            { icon: Globe, title: "Global Perspective", desc: "Preparing citizens for an interconnected world." },
            { icon: Award, title: "Integrity", desc: "Ethical conduct in research, teaching, and governance." },
          ].map((v, i) => (
            <motion.div
              key={v.title}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-6 text-center"
            >
              <v.icon className="mx-auto mb-3 h-8 w-8 text-accent" />
              <h3 className="font-display text-lg font-semibold text-foreground">{v.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Leadership */}
    <section className="section-padding bg-secondary">
      <div className="container">
        <SectionHeading
          title="University Leadership"
          subtitle="Meet the people guiding Akademia's mission"
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {leadership.map((p, i) => (
            <motion.div
              key={p.name}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.1 }}
              className="overflow-hidden rounded-xl bg-card shadow-sm"
            >
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src={p.image}
                  alt={p.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
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

export default About;
