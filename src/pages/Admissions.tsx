import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, FileText, ClipboardCheck, Send, Upload } from "lucide-react";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import SectionHeading from "@/components/SectionHeading";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

const Admissions = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", program: "", motivation: "", document: null as File | null });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const steps = [
    { icon: FileText, title: t("admissions.step1Title"), desc: t("admissions.step1Desc") },
    { icon: ClipboardCheck, title: t("admissions.step2Title"), desc: t("admissions.step2Desc") },
    { icon: Send, title: t("admissions.step3Title"), desc: t("admissions.step3Desc") },
    { icon: CheckCircle, title: t("admissions.step4Title"), desc: t("admissions.step4Desc") },
  ];

  const requirements = Array.from({ length: 7 }, (_, i) => t(`admissions.req${i + 1}`));

  const { data: programs } = useQuery({
    queryKey: ["programs-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("slug, title, degree").order("title");
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let document_url: string | null = null;

    // Upload document if provided
    if (form.document) {
      const ext = form.document.name.split(".").pop();
      const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("application-documents").upload(path, form.document);
      if (uploadErr) {
        toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      document_url = path;
    }

    // Get current user if logged in, to link application to their account
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    const { error } = await supabase.from("applications").insert({
      full_name: form.fullName,
      email: form.email,
      phone: form.phone || null,
      program: form.program,
      motivation: form.motivation,
      document_url,
      user_id: currentUser?.id || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: t("admissions.errorTitle"), description: t("admissions.errorDesc"), variant: "destructive" });
    } else {
      setSubmitted(true);
      toast({ title: t("admissions.successTitle"), description: t("admissions.successDesc") });
    }
  };

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <Layout>
      <PageHero title={t("admissions.title")} subtitle={t("admissions.subtitle")} />

      <section className="section-padding">
        <div className="container">
          <SectionHeading title={t("admissions.requirements")} />
          <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card p-6 md:p-8">
            <ul className="space-y-4 text-muted-foreground">
              {requirements.map((r) => (
                <li key={r} className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section-padding bg-secondary">
        <div className="container">
          <SectionHeading title={t("admissions.howToApply")} subtitle={t("admissions.howToApplySub")} />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1 }} className="rounded-xl bg-card p-6 text-center shadow-sm">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <s.icon className="h-5 w-5" />
                </div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Step {i + 1}</p>
                <h3 className="font-display text-base font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container">
          <SectionHeading title={t("admissions.onlineApplication")} subtitle={t("admissions.onlineApplicationSub")} />
          {submitted ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-lg rounded-xl border border-border bg-card p-10 text-center">
              <CheckCircle className="mx-auto mb-4 h-16 w-16 text-accent" />
              <h3 className="font-display text-2xl font-semibold text-foreground">{t("admissions.applicationReceived")}</h3>
              <p className="mt-2 text-muted-foreground">{t("admissions.applicationReceivedDesc")}</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-5 rounded-xl border border-border bg-card p-6 md:p-8">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">{t("admissions.fullName")} *</label>
                  <input required type="text" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder={t("admissions.fullName")} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">{t("admissions.email")} *</label>
                  <input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="your@email.com" />
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">{t("admissions.phone")}</label>
                  <input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="+355 ..." />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">{t("admissions.program")} *</label>
                  <select required value={form.program} onChange={(e) => update("program", e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">{t("admissions.selectProgram")}</option>
                    {programs?.map((p) => (
                      <option key={p.slug} value={p.slug}>{p.title} ({p.degree})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">{t("admissions.motivationLetter")} *</label>
                <textarea required rows={5} value={form.motivation} onChange={(e) => update("motivation", e.target.value)} className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder={t("admissions.motivationPlaceholder")} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Upload Document (PDF, optional)</label>
                <div className="relative flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary">
                    <Upload className="h-4 w-4" />
                    {form.document ? form.document.name : "Choose file..."}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setForm((f) => ({ ...f, document: file }));
                      }}
                    />
                  </label>
                  {form.document && (
                    <button type="button" onClick={() => setForm((f) => ({ ...f, document: null }))} className="text-xs text-destructive hover:underline">
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <button type="submit" disabled={submitting} className="w-full rounded-md bg-primary py-3 font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-60">
                {submitting ? t("admissions.submitting") : t("admissions.submitApplication")}
              </button>
            </form>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Admissions;
