import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Send, CheckCircle } from "lucide-react";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Contact = () => {
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
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } else {
      setSubmitted(true);
      toast({ title: "Message Sent!", description: "We'll get back to you as soon as possible." });
    }
  };

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <Layout>
      <PageHero
        title="Contact Us"
        subtitle="We'd love to hear from you — reach out with questions, feedback, or just to say hello"
      />

      <section className="section-padding">
        <div className="container grid gap-12 lg:grid-cols-5">
          {/* Info */}
          <div className="lg:col-span-2">
            <h2 className="heading-md text-foreground">Get in Touch</h2>
            <div className="mt-2 h-1 w-12 rounded-full bg-accent" />
            <div className="mt-8 space-y-6">
              {[
                { icon: MapPin, label: "Address", value: "123 University Boulevard\nTirana, Albania 1001" },
                { icon: Phone, label: "Phone", value: "+355 4 123 4567" },
                { icon: Mail, label: "Email", value: "info@akademia.edu" },
                { icon: Clock, label: "Office Hours", value: "Mon – Fri: 8:00 AM – 5:00 PM" },
              ].map((item) => (
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
              <iframe
                title="University location"
                src="https://www.openstreetmap.org/export/embed.html?bbox=19.80%2C41.31%2C19.85%2C41.34&layer=mapnik"
                className="h-56 w-full"
                loading="lazy"
              />
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3">
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex h-full items-center justify-center rounded-xl border border-border bg-card p-10"
              >
                <div className="text-center">
                  <CheckCircle className="mx-auto mb-4 h-16 w-16 text-accent" />
                  <h3 className="font-display text-2xl font-semibold text-foreground">Thank You!</h3>
                  <p className="mt-2 text-muted-foreground">Your message has been sent. We'll respond shortly.</p>
                </div>
              </motion.div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="space-y-5 rounded-xl border border-border bg-card p-6 md:p-8"
              >
                <h3 className="font-display text-xl font-semibold text-foreground">Send a Message</h3>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Name *</label>
                    <input required type="text" value={form.name} onChange={(e) => update("name", e.target.value)} className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Your name" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Email *</label>
                    <input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="your@email.com" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Subject *</label>
                  <input required type="text" value={form.subject} onChange={(e) => update("subject", e.target.value)} className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="What is this regarding?" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Message *</label>
                  <textarea required rows={5} value={form.message} onChange={(e) => update("message", e.target.value)} className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Your message..." />
                </div>
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-60">
                  <Send className="h-4 w-4" />
                  {submitting ? "Sending..." : "Send Message"}
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
