import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle, MessageSquareWarning, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Submission = {
  id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
  is_anonymous: boolean;
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-rose-100 text-rose-800",
  in_review: "bg-amber-100 text-amber-800",
  resolved: "bg-emerald-100 text-emerald-800",
  closed: "bg-slate-100 text-slate-700",
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  normal: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-rose-100 text-rose-800",
};

const complaintSchema = z.object({
  submitter_name: z.string().trim().max(100, "Name too long").optional(),
  submitter_email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  category: z.string().min(1),
  subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(150, "Subject too long"),
  message: z.string().trim().min(10, "Please provide at least 10 characters").max(2000, "Message too long"),
  priority: z.string().min(1),
});

const Complaints = () => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({
    submitter_name: "",
    submitter_email: "",
    category: "general",
    subject: "",
    message: "",
    priority: "normal",
    is_anonymous: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mySubmissions, setMySubmissions] = useState<Submission[]>([]);
  const [loadingMine, setLoadingMine] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (u) {
        setUserId(u.id);
        setForm((f) => ({
          ...f,
          submitter_email: u.email ?? "",
          submitter_name: (u.user_metadata?.full_name as string) ?? "",
        }));
        loadMine(u.id);
      }
    });
  }, []);

  const loadMine = async (uid: string) => {
    setLoadingMine(true);
    const { data, error } = await supabase
      .from("complaint_submissions")
      .select("id,subject,message,category,status,priority,admin_response,responded_at,created_at,is_anonymous")
      .eq("user_id", uid)
      .eq("is_anonymous", false)
      .order("created_at", { ascending: false });
    if (!error && data) setMySubmissions(data as Submission[]);
    setLoadingMine(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = complaintSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Invalid input", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("complaint_submissions").insert({
      user_id: form.is_anonymous ? null : userId,
      is_anonymous: form.is_anonymous,
      submitter_name: form.is_anonymous ? "" : form.submitter_name,
      submitter_email: form.is_anonymous ? "" : form.submitter_email,
      category: form.category,
      subject: form.subject,
      message: form.message,
      priority: form.priority,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
      return;
    }
    setSubmitted(true);
    toast({ title: "Submitted", description: "Thank you — we have received your submission." });
    if (userId && !form.is_anonymous) loadMine(userId);
  };

  const resetForm = () => {
    setSubmitted(false);
    setForm((f) => ({ ...f, subject: "", message: "", category: "general", priority: "normal" }));
  };

  return (
    <Layout>
      <PageHero
        title="Complaint Box"
        subtitle="Share your concerns, suggestions or feedback. We listen."
      />

      <section className="section-padding">
        <div className="container">
          <Tabs defaultValue="submit">
            <TabsList className="mb-6">
              <TabsTrigger value="submit">
                <MessageSquareWarning className="mr-2 h-4 w-4" /> Submit
              </TabsTrigger>
              {userId && (
                <TabsTrigger value="mine">
                  <Eye className="mr-2 h-4 w-4" /> My Submissions ({mySubmissions.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="submit">
              <div className="grid gap-8 lg:grid-cols-5">
                <div className="lg:col-span-2 space-y-4">
                  <h2 className="heading-md text-foreground">How it works</h2>
                  <div className="h-1 w-12 rounded-full bg-accent" />
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex gap-3"><span className="font-bold text-accent">1.</span> Choose a category and describe your concern clearly.</li>
                    <li className="flex gap-3"><span className="font-bold text-accent">2.</span> Submit anonymously if you prefer — but you won't be able to track its status.</li>
                    <li className="flex gap-3"><span className="font-bold text-accent">3.</span> Our team reviews every submission and responds when needed.</li>
                    <li className="flex gap-3"><span className="font-bold text-accent">4.</span> Logged-in users can track status under <strong>My Submissions</strong>.</li>
                  </ul>
                  <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
                    <strong className="text-foreground">Privacy:</strong> Anonymous submissions do not store your name, email or account link.
                  </div>
                </div>

                <div className="lg:col-span-3">
                  {submitted ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-12 text-center">
                      <CheckCircle className="mx-auto mb-4 h-16 w-16 text-accent" />
                      <h3 className="font-display text-2xl font-semibold text-foreground">Thank you</h3>
                      <p className="mt-2 text-muted-foreground">Your submission has been received and will be reviewed.</p>
                      <Button onClick={resetForm} className="mt-6">Submit another</Button>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="glass-card space-y-5 p-7 md:p-9">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="anon"
                          checked={form.is_anonymous}
                          onCheckedChange={(v) => setForm({ ...form, is_anonymous: !!v })}
                        />
                        <Label htmlFor="anon" className="flex items-center gap-1 cursor-pointer">
                          <EyeOff className="h-4 w-4" /> Submit anonymously
                        </Label>
                      </div>

                      {!form.is_anonymous && (
                        <div className="grid gap-5 sm:grid-cols-2">
                          <div>
                            <Label className="mb-1.5 block">Name</Label>
                            <Input
                              value={form.submitter_name}
                              onChange={(e) => setForm({ ...form, submitter_name: e.target.value })}
                              placeholder="Your name"
                              maxLength={100}
                            />
                          </div>
                          <div>
                            <Label className="mb-1.5 block">Email</Label>
                            <Input
                              type="email"
                              value={form.submitter_email}
                              onChange={(e) => setForm({ ...form, submitter_email: e.target.value })}
                              placeholder="you@example.com"
                              maxLength={255}
                            />
                          </div>
                        </div>
                      )}

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <Label className="mb-1.5 block">Category</Label>
                          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">General</SelectItem>
                              <SelectItem value="academic">Academic</SelectItem>
                              <SelectItem value="facilities">Facilities</SelectItem>
                              <SelectItem value="staff">Staff / Service</SelectItem>
                              <SelectItem value="finance">Finance / Tuition</SelectItem>
                              <SelectItem value="suggestion">Suggestion</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="mb-1.5 block">Priority</Label>
                          <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label className="mb-1.5 block">Subject *</Label>
                        <Input
                          required
                          value={form.subject}
                          onChange={(e) => setForm({ ...form, subject: e.target.value })}
                          placeholder="Short summary"
                          maxLength={150}
                        />
                      </div>

                      <div>
                        <Label className="mb-1.5 block">Message *</Label>
                        <Textarea
                          required
                          rows={6}
                          value={form.message}
                          onChange={(e) => setForm({ ...form, message: e.target.value })}
                          placeholder="Describe your concern in detail..."
                          maxLength={2000}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">{form.message.length}/2000</p>
                      </div>

                      <Button type="submit" disabled={submitting} className="gap-2">
                        <Send className="h-4 w-4" />
                        {submitting ? "Submitting..." : "Submit"}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </TabsContent>

            {userId && (
              <TabsContent value="mine">
                {loadingMine ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : mySubmissions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
                    You haven't submitted anything yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mySubmissions.map((s) => (
                      <div key={s.id} className="rounded-xl border border-border bg-card p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-foreground">{s.subject}</h3>
                              <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${STATUS_STYLES[s.status] || ""}`}>{s.status.replace("_", " ")}</span>
                              <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${PRIORITY_STYLES[s.priority] || ""}`}>{s.priority}</span>
                              <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{s.category}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Submitted {new Date(s.created_at).toLocaleString()}
                            </p>
                            <p className="mt-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">{s.message}</p>

                            {s.admin_response ? (
                              <div className="mt-4 rounded-lg bg-muted/50 p-3">
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase">Admin Response</p>
                                <p className="text-sm mt-1 whitespace-pre-wrap">{s.admin_response}</p>
                                {s.responded_at && (
                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    {new Date(s.responded_at).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="mt-3 text-xs italic text-muted-foreground">Awaiting response from administration.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </section>
    </Layout>
  );
};

export default Complaints;
