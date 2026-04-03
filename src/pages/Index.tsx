import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Users, Globe, Award, ArrowRight, Calendar } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { programs } from "@/data/programs";
import { newsArticles } from "@/data/news";

const stats = [
  { icon: Users, value: "12,000+", label: "Students" },
  { icon: BookOpen, value: "45+", label: "Programs" },
  { icon: Globe, value: "30+", label: "Partner Universities" },
  { icon: Award, value: "98%", label: "Employment Rate" },
];

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const Index = () => (
  <Layout>
    {/* Hero */}
    <section className="relative overflow-hidden bg-primary py-24 text-primary-foreground md:py-36">
      <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-accent/10" />
      <div className="absolute -bottom-20 left-1/4 h-72 w-72 rounded-full bg-accent/5" />
      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-accent">
            Where Knowledge Meets Purpose
          </p>
          <h1 className="heading-xl leading-tight">
            Shape Your Future at{" "}
            <span className="text-accent">Akademia</span> University
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed opacity-80">
            A world-class education rooted in innovation, research, and community.
            Discover programs designed to prepare you for the careers of tomorrow.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/programs"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 font-semibold text-accent-foreground transition-transform hover:scale-105"
            >
              Explore Programs <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/admissions"
              className="inline-flex items-center gap-2 rounded-md border border-primary-foreground/30 px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
            >
              Apply Now
            </Link>
          </div>
        </motion.div>
      </div>
    </section>

    {/* Stats */}
    <section className="-mt-10 relative z-20">
      <div className="container">
        <div className="grid grid-cols-2 gap-4 rounded-xl bg-card p-6 shadow-lg md:grid-cols-4 md:p-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.1 }}
              className="text-center"
            >
              <s.icon className="mx-auto mb-2 h-8 w-8 text-accent" />
              <p className="font-display text-2xl font-bold text-foreground md:text-3xl">
                {s.value}
              </p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Featured Programs */}
    <section className="section-padding">
      <div className="container">
        <SectionHeading
          title="Our Programs"
          subtitle="Explore degrees across five faculties designed for the modern world"
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {programs.slice(0, 6).map((p, i) => (
            <motion.div key={p.id} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }}>
              <Link
                to={`/programs/${p.id}`}
                className="group flex h-full flex-col rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-lg"
              >
                <span className="mb-2 inline-block self-start rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent-foreground">
                  {p.degree}
                </span>
                <h3 className="font-display text-xl font-semibold text-foreground group-hover:text-primary">
                  {p.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.faculty}</p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {p.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Learn more <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            to="/programs"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground transition-transform hover:scale-105"
          >
            View All Programs <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>

    {/* Why Choose Us */}
    <section className="section-padding bg-secondary">
      <div className="container">
        <SectionHeading
          title="Why Akademia?"
          subtitle="Reasons students choose us year after year"
        />
        <div className="grid gap-8 md:grid-cols-3">
          {[
            { title: "Research-Driven", desc: "Our faculty publishes in top-tier journals and involves students in cutting-edge research from their first year." },
            { title: "Global Network", desc: "Exchange programs with 30+ universities worldwide give students international experience and perspective." },
            { title: "Career Ready", desc: "Industry partnerships, internships, and a dedicated career center ensure 98% of graduates find employment within 6 months." },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.1 }}
              className="rounded-xl bg-card p-8 shadow-sm"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/15">
                <Award className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Latest News */}
    <section className="section-padding">
      <div className="container">
        <SectionHeading
          title="Latest News & Events"
          subtitle="Stay up to date with what's happening on campus"
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {newsArticles.slice(0, 3).map((a, i) => (
            <motion.div key={a.id} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.1 }}>
              <Link
                to={`/news/${a.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg"
              >
                <div className="aspect-video overflow-hidden">
                  <img
                    src={a.image}
                    alt={a.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(a.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent-foreground">
                      {a.category}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary">
                    {a.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {a.excerpt}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            to="/news"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            View All News <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="bg-primary py-16 text-primary-foreground md:py-20">
      <div className="container text-center">
        <h2 className="heading-lg">Ready to Begin Your Journey?</h2>
        <p className="mx-auto mt-4 max-w-lg text-lg opacity-80">
          Applications for Spring 2026 are now open. Take the first step toward your future today.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            to="/admissions"
            className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 font-semibold text-accent-foreground transition-transform hover:scale-105"
          >
            Apply Now <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-md border border-primary-foreground/30 px-6 py-3 font-semibold transition-colors hover:bg-primary-foreground/10"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </section>
  </Layout>
);

export default Index;
