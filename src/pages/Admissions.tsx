import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, FileText, ClipboardCheck, Send } from "lucide-react";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import SectionHeading from "@/components/SectionHeading";
import { programs } from "@/data/programs";
import { useToast } from "@/hooks/use-toast";

const steps = [
  { icon: FileText, title: "Review Requirements", desc: "Check eligibility criteria and required documents for your chosen program." },
  { icon: ClipboardCheck, title: "Prepare Documents", desc: "Gather transcripts, ID, motivation letter, and any additional materials." },
  { icon: Send, title: "Submit Application", desc: "Complete the online form below and upload your documents." },
  { icon: CheckCircle, title: "Receive Decision", desc: "Applications are reviewed within 2–4 weeks. Accepted students receive enrollment instructions." },
];

const Admissions = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    program: "",
    motivation: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Simulate submission
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      toast({ title: "Application Submitted!", description: "We'll review your application and get back to you within 2–4 weeks." });
    }, 1500);
  };

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <Layout>
      <PageHero
        title="Admissions"
        subtitle="Take the first step toward your future — apply to Akademia University today"
      />

      {/* Requirements */}
      <section className="section-padding">
        <div className="container">
          <SectionHeading title="Admission Requirements" />
          <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card p-6 md:p-8">
            <ul className="space-y-4 text-muted-foreground">
              {[
                "High school diploma or equivalent (for Bachelor programs)",
                "Bachelor's degree from an accredited institution (for Master programs)",
                "Official academic transcripts",
                "Valid government-issued ID or passport",
                "Motivation letter (500–800 words)",
                "Two letters of recommendation (for graduate programs)",
                "English language proficiency certificate (IELTS 6.0+ or TOEFL 80+)",
              ].map((r) => (
                <li key={r} className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="section-padding bg-secondary">
        <div className="container">
          <SectionHeading title="How to Apply" subtitle="Follow these four simple steps" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="rounded-xl bg-card p-6 text-center shadow-sm"
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <s.icon className="h-5 w-5" />
                </div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {i + 1}
                </p>
                <h3 className="font-display text-base font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="section-padding">
        <div className="container">
          <SectionHeading title="Online Application" subtitle="Fill out the form to start your application" />

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mx-auto max-w-lg rounded-xl border border-border bg-card p-10 text-center"
            >
              <CheckCircle className="mx-auto mb-4 h-16 w-16 text-accent" />
              <h3 className="font-display text-2xl font-semibold text-foreground">Application Received!</h3>
              <p className="mt-2 text-muted-foreground">
                Thank you for applying. We'll review your application and contact you within 2–4 weeks.
              </p>
            </motion.div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mx-auto max-w-2xl space-y-5 rounded-xl border border-border bg-card p-6 md:p-8"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Full Name *</label>
                  <input
                    required
                    type="text"
                    value={form.fullName}
                    onChange={(e) => update("fullName", e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Email *</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="+355 ..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Program *</label>
                  <select
                    required
                    value={form.program}
                    onChange={(e) => update("program", e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select a program</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.degree})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Motivation Letter *</label>
                <textarea
                  required
                  rows={5}
                  value={form.motivation}
                  onChange={(e) => update("motivation", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Tell us why you want to study at Akademia..."
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-primary py-3 font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit Application"}
              </button>
            </form>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Admissions;
