import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import {
  fetchScholarshipDocs,
  DEFAULT_BASE_DOCUMENTS,
  DEFAULT_EXTRA_DOCS,
} from "@/lib/scholarshipDocs";
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
  Download,
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

const generateChecklistPdf = (
  baseDocuments: string[],
  extraDocsByScholarship: Record<string, string[]>,
  scholarship?: (typeof scholarships)[number],
) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  // Header band
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageW, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("WBU — Scholarship Application Checklist", margin, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Western Balkan University", margin, 64);
  doc.text(
    `Generated: ${new Date().toLocaleDateString()}`,
    pageW - margin,
    64,
    { align: "right" }
  );

  y = 130;

  // Scholarship title block
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(scholarship ? scholarship.name : "All Scholarships", margin, y);
  y += 20;

  if (scholarship) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(13, 148, 136); // teal
    doc.text(scholarship.coverage, margin, y);
    y += 18;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    const desc = doc.splitTextToSize(scholarship.description, pageW - margin * 2);
    doc.text(desc, margin, y);
    y += desc.length * 14 + 10;

    // Eligibility
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20, 20, 20);
    doc.text("Eligibility", margin, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    scholarship.eligibility.forEach((e) => {
      doc.text(`•  ${e}`, margin + 4, y);
      y += 16;
    });
    y += 10;
  }

  // Documents checklist
  const docsList = scholarship
    ? [...baseDocuments, ...(extraDocsByScholarship[scholarship.name] || [])]
    : baseDocuments;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text("Required Documents", margin, y);
  y += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);

  const lineH = 22;
  docsList.forEach((d) => {
    if (y > pageH - margin - 60) {
      doc.addPage();
      y = margin;
    }
    // checkbox
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(1);
    doc.rect(margin, y - 11, 12, 12);
    const wrapped = doc.splitTextToSize(d, pageW - margin * 2 - 24);
    doc.text(wrapped, margin + 22, y);
    y += Math.max(lineH, wrapped.length * 14 + 8);
  });

  // Footer note
  if (y > pageH - margin - 80) {
    doc.addPage();
    y = margin;
  }
  y += 10;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageW - margin, y);
  y += 18;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  const note =
    "Tip: Tick each box once the document is ready, then upload everything through your online application at wbu.lovable.app/admissions. For questions contact admissions@wbu.edu.";
  const noteLines = doc.splitTextToSize(note, pageW - margin * 2);
  doc.text(noteLines, margin, y);

  const safeName = (scholarship?.name || "WBU-Scholarships")
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase();
  doc.save(`${safeName}-checklist.pdf`);
};

const Scholarships = () => {
  const [baseDocuments, setBaseDocuments] = useState<string[]>(DEFAULT_BASE_DOCUMENTS);
  const [extraDocs, setExtraDocs] = useState<Record<string, string[]>>(DEFAULT_EXTRA_DOCS);

  useEffect(() => {
    fetchScholarshipDocs().then(({ base, extra }) => {
      setBaseDocuments(base);
      setExtraDocs(extra);
    });
  }, []);

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
                <button
                  type="button"
                  onClick={() => generateChecklistPdf(baseDocuments, extraDocs, s)}
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-4 py-2 text-xs font-semibold text-accent transition-all hover:bg-accent hover:text-accent-foreground"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download checklist
                </button>
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
              <button
                type="button"
                onClick={() => generateChecklistPdf(baseDocuments, extraDocs)}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition-all hover:shadow-xl hover:shadow-accent/30 hover:scale-105"
              >
                <Download className="h-4 w-4" />
                Download general checklist (PDF)
              </button>
              <p className="mt-3 text-xs text-muted-foreground">
                Tip: each scholarship card also has its own tailored checklist.
              </p>
            </motion.div>

            <motion.ul {...fadeUp} className="grid gap-3">
              {baseDocuments.map((d) => (
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
