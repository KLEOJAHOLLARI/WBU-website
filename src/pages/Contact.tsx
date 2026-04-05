import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Send, CheckCircle } from "lucide-react";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const Contact = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("contact_submissions").insert({
      name: form.name,
      email: form.email,
      subject: form.subject,
      message: form.message,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: t("contact.errorTitle"), description: t("contact.errorDesc"), variant: "destructive" });
    } else {
      setSubmitted(true);
      toast({ title: t("contact.successTitle"), description: t("contact.successDesc") });
    }
  };

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const contactInfo = [
    { icon: MapPin, label: t("contact.address"), value: t("contact.addressValue") },
    { icon: Phone, label: t("contact.phone"), value: "+355 67 60 20 600\n+355 67 40 20 600" },
    { icon: Mail, label: t("contact.email"), value: "info@wbu.edu.al" },
    { icon: Clock, label: t("contact.officeHours"), value: t("contact.officeHoursValue") },
  ];

  return (
    <Layout>
      <PageHero title={t("contact.title")} subtitle={t("contact.subtitle")} />

      <section className="section-padding">
        <div className="container grid gap-12 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <h2 className="heading-md text-foreground">{t("contact.getInTouch")}</h2>
            <div className="mt-2 h-1 w-12 rounded-full bg-accent" />
            <div className="mt-8 space-y-6">
              {contactInfo.map((item) => (
                <div key={item.label} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15">
                    <item.icon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="whitespace-pre-line text-sm text-muted-foreground">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 overflow-hidden rounded-xl border border-border">
              <iframe title="University location" src="https://www.openstreetmap.org/export/embed.html?bbox=19.80%2C41.31%2C19.85%2C41.34&layer=mapnik" className="h-56 w-full" loading="lazy" />
            </div>
          </div>

          <div className="lg:col-span-3">
            {submitted ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex h-full items-center justify-center rounded-xl border border-border bg-card p-10">
                <div className="text-center">
                  <CheckCircle className="mx-auto mb-4 h-16 w-16 text-accent" />
                  <h3 className="font-display text-2xl font-semibold text-foreground">{t("contact.thankYou")}</h3>
                  <p className="mt-2 text-muted-foreground">{t("contact.thankYouDesc")}</p>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border bg-card p-6 md:p-8">
                <h3 className="font-display text-xl font-semibold text-foreground">{t("contact.sendMessage")}</h3>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">{t("contact.name")} *</label>
                    <input required type="text" value={form.name} onChange={(e) => update("name", e.target.value)} className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder={t("contact.namePlaceholder")} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">{t("contact.email")} *</label>
                    <input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder={t("contact.emailPlaceholder")} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">{t("contact.subject")} *</label>
                  <input required type="text" value={form.subject} onChange={(e) => update("subject", e.target.value)} className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder={t("contact.subjectPlaceholder")} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">{t("contact.message")} *</label>
                  <textarea required rows={5} value={form.message} onChange={(e) => update("message", e.target.value)} className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder={t("contact.messagePlaceholder")} />
                </div>
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-60">
                  <Send className="h-4 w-4" />
                  {submitting ? t("contact.sending") : t("contact.send")}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
