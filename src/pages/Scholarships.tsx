import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Award,
  GraduationCap,
  Globe2,
  Heart,
  Trophy,
  Users,
  CheckCircle2,
  ArrowRight,
  FileText,
  Send,
  Sparkles,
} from "lucide-react";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import SectionHeading from "@/components/SectionHeading";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const scholarships = [
  {
    icon: Trophy,
    name: "Merit Excellence Scholarship",
    coverage: "Up to 100% tuition",
    description:
      "Awarded to outstanding incoming students with exceptional academic records and entrance results.",
    eligibility: ["GPA ≥ 9.0 / 90%+", "Top 5% in entrance exam", "Full-time enrollment"],
    badge: "Most popular",
  },
  {
    icon: Heart,
    name: "Need-Based Grant",
    coverage: "Up to 50% tuition",
    description:
      "Financial assistance for talented students from families with demonstrated financial need.",
    eligibility: ["Verified family income", "Minimum 7.0 GPA", "Personal statement"],
  },
  {
    icon: Globe2,
    name: "International Student Award",
    coverage: "30% tuition",
    description:
      "Encouraging cultural diversity, this award supports international students enrolling at WBU.",
    eligibility: ["Non-resident applicant", "Strong academic profile", "Language proficiency"],
  },
  {
    icon: Users,
    name: "Community Leadership",
    coverage: "25% tuition",
    description:
      "Recognizing students with proven volunteer work, leadership, or community service impact.",
    eligibility: ["Documented community work", "Two recommendations", "Leadership essay"],
  },
  {
    icon: GraduationCap,
    name: "Alumni Family Discount",
    coverage: "20% tuition",
    description:
      "A benefit for students whose parents or siblings are WBU graduates — keeping the family tradition.",
    eligibility: ["Direct relation to WBU alum", "Verification documents"],
  },
  {
    icon: Award,
    name: "Sports & Arts Talent",
    coverage: "Up to 40% tuition",
    description:
      "For nationally recognized athletes, musicians, and artists representing WBU in competitions.",
    eligibility: ["National ranking or awards", "Coach/mentor recommendation"],
  },
];

const steps = [
  {
    n: "01",
    title: "Choose your program",
    text: "Browse our programs and select the one you wish to apply for.",
  },
  {
    n: "02",
    title: "Submit application",
    text: "Complete the online admission application with all required documents.",
  },
  {
    n: "03",
    title: "Indicate scholarship",
    text: "Check the scholarship you’re applying for inside the admission form.",
  },
  {
    n: "04",
    title: "Review & decision",
    text: "Our committee reviews and notifies awardees within 2–3 weeks.",
  },
];

const faqs = [
  {
    q: "When can I apply for a scholarship?",
    a: "Scholarship applications open together with the admission cycle. You can submit yours alongside your admission application — there is no separate form.",
  },
  {
    q: "Can I receive more than one scholarship?",
    a: "In most cases scholarships are not stackable, but our committee will automatically award you the highest one you qualify for. Sibling discounts may combine with academic awards.",
  },
  {
    q: "Are scholarships renewed every year?",
    a: "Yes, provided the student maintains the required GPA (typically 8.0+) and remains enrolled full-time without disciplinary issues.",
  },
  {
    q: "Do international students qualify?",
    a: "Absolutely. International students are eligible for the International Student Award and may also apply for merit scholarships.",
  },
  {
    q: "What documents do I need?",
    a: "A completed application, transcripts, ID/passport, motivation letter, and any supporting documents (recommendations, certificates, income proof for need-based aid).",
  },
  {
    q: "When will I be notified?",
    a: "Scholarship decisions are usually communicated within 2–3 weeks after the admission decision via email and the student portal.",
  },
];

const Scholarships = () => {
  return (
    <Layout>
      <PageHero
        title="Scholarships"
        subtitle="Invest in your future. Discover financial support designed to help talented students thrive at WBU."
      />

      {/* Intro / Highlights */}
      <section className="section-padding">
        <div className="container">
          <div className="grid gap-8 lg:grid-cols-3 lg:gap-10">
            <motion.div {...fadeUp} className="lg:col-span-2">
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-accent">
                <Sparkles className="h-3.5 w-3.5" /> Financial Support
              </span>
              <h2 className="heading-lg text-foreground">
                Empowering students through opportunity
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                At WBU, we believe finances should never block ambition. Each year,
                hundreds of students receive scholarships and grants based on academic
                merit, financial need, and exceptional talent. Explore the options
                below and apply through our standard admission process.
              </p>
            </motion.div>

            <motion.div {...fadeUp} className="grid gap-3">
              {[
                { v: "€1.2M+", l: "Awarded annually" },
                { v: "300+", l: "Students supported" },
                { v: "100%", l: "Max coverage available" },
              ].map((s) => (
                <div
                  key={s.l}
                  className="rounded-2xl border border-border/60 bg-card p-5"
                >
                  <p className="font-display text-3xl font-bold text-foreground">
                    {s.v}
                  </p>
                  <p className="text-sm text-muted-foreground">{s.l}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Scholarship Types */}
      <section className="section-padding bg-secondary/40">
        <div className="container">
          <SectionHeading
            title="Available Scholarships"
            subtitle="Choose the program that best matches your background and goals."
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {scholarships.map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-2xl hover:shadow-accent/10"
              >
                {s.badge && (
                  <span className="absolute right-4 top-4 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                    {s.badge}
                  </span>
                )}
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20 transition-transform duration-300 group-hover:scale-110">
                  <s.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {s.name}
                </h3>
                <p className="mt-1 text-sm font-semibold text-accent">{s.coverage}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {s.description}
                </p>
                <ul className="mt-5 space-y-2">
                  {s.eligibility.map((e) => (
                    <li
                      key={e}
                      className="flex items-start gap-2 text-sm text-foreground/80"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Apply */}
      <section className="section-padding">
        <div className="container">
          <SectionHeading
            title="How to Apply"
            subtitle="A simple, transparent process from application to decision."
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="relative rounded-2xl border border-border/60 bg-card p-7"
              >
                <span className="font-display text-5xl font-bold text-accent/15">
                  {s.n}
                </span>
                <h3 className="mt-2 font-display text-lg font-semibold text-foreground">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {s.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Required Documents */}
      <section className="section-padding bg-secondary/40">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <motion.div {...fadeUp}>
              <span className="mb-3 inline-block rounded-full border border-accent/20 bg-accent/5 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-accent">
                Required Documents
              </span>
              <h2 className="heading-lg text-foreground">
                Prepare your application package
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Make sure these documents are ready before starting. Uploading them
                in your application portal speeds up evaluation considerably.
              </p>
            </motion.div>

            <motion.ul {...fadeUp} className="grid gap-3">
              {[
                "Completed online admission application",
                "Official high-school or previous-degree transcripts",
                "National ID or passport copy",
                "Motivation letter (max 1 page)",
                "Two letters of recommendation",
                "Proof of financial need (for need-based aid)",
                "Awards, certificates, or portfolio (if applicable)",
              ].map((d) => (
                <li
                  key={d}
                  className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4"
                >
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <span className="text-sm text-foreground">{d}</span>
                </li>
              ))}
            </motion.ul>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="section-padding">
        <div className="container max-w-4xl">
          <SectionHeading
            title="Frequently Asked Questions"
            subtitle="Everything you need to know about WBU scholarships."
          />
          <motion.div {...fadeUp}>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((f, i) => (
                <AccordionItem
                  key={f.q}
                  value={`item-${i}`}
                  className="rounded-xl border border-border/60 bg-card mb-3 px-5"
                >
                  <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-primary py-24 text-primary-foreground md:py-32">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 top-0 h-80 w-80 rounded-full bg-accent/15 blur-3xl" />
          <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        </div>
        <div className="container relative z-10 text-center">
          <motion.div {...fadeUp}>
            <h2 className="heading-lg">Ready to apply for a scholarship?</h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-primary-foreground/75">
              Start your online admission application and tick the scholarship box
              that matches your profile. It takes only a few minutes.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                to="/admissions"
                className="group inline-flex items-center gap-2 rounded-full bg-accent px-8 py-4 font-semibold text-accent-foreground shadow-xl shadow-accent/25 transition-all duration-300 hover:shadow-2xl hover:shadow-accent/40 hover:scale-105"
              >
                <Send className="h-4 w-4" />
                Apply Online Now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 px-8 py-4 font-semibold transition-all duration-300 hover:bg-primary-foreground/10"
              >
                Contact Admissions
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Scholarships;
