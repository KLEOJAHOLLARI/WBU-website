import { useState } from "react";
import StudentLayout from "@/components/StudentLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CreditCard, AlertTriangle, CheckCircle2, Wallet, Receipt, FileDown, Upload } from "lucide-react";

const fmtMoney = (n: number, c: string = "EUR") => new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n || 0);

const StudentTuition = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [uploadFor, setUploadFor] = useState<any | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["student-tuition-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("program, scholarship_percentage, has_scholarship, full_name, student_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: programInfo } = useQuery({
    queryKey: ["student-tuition-program", profile?.program],
    queryFn: async () => {
      const { data } = await supabase.from("programs").select("slug, title").eq("slug", profile!.program!).maybeSingle();
      return data;
    },
    enabled: !!profile?.program,
  });

  const { data: programFees = [] } = useQuery({
    queryKey: ["student-tuition-program-fees", profile?.program],
    queryFn: async () => {
      const { data } = await supabase.from("program_tuition_fees").select("*").eq("program", profile!.program!);
      return data || [];
    },
    enabled: !!profile?.program,
  });

  const { data: charges = [] } = useQuery({
    queryKey: ["student-charges", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("tuition_charges").select("*").eq("user_id", user!.id).order("due_date", { ascending: true, nullsFirst: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["student-payments", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("tuition_payments").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: semesters = [] } = useQuery({
    queryKey: ["student-tuition-semesters"],
    queryFn: async () => {
      const { data } = await supabase.from("academic_semesters").select("id, name, is_current").order("year", { ascending: false });
      return data || [];
    },
  });
  const semMap = Object.fromEntries(semesters.map((s: any) => [s.id, s]));

  const scholarshipPct = Math.max(0, Math.min(100, Number(profile?.scholarship_percentage || 0)));
  const currentSem = semesters.find((s: any) => s.is_current);
  const currentFee = programFees.find((f: any) => f.academic_semester_id === currentSem?.id) || programFees[0];
  const annualTuition = Number(currentFee?.amount || 0);
  const afterScholarship = +(annualTuition * (100 - scholarshipPct) / 100).toFixed(2);

  const totalCharged = charges.reduce((s, c) => s + Number(c.amount), 0);
  const verifiedPaid = payments.filter((p) => p.verification_status === "verified").reduce((s, p) => s + Number(p.amount), 0);
  const balance = totalCharged - verifiedPaid;
  const overdue = charges.filter((c) => c.due_date && new Date(c.due_date) < new Date() && c.status !== "paid" && c.status !== "waived");
  const pendingCount = payments.filter((p) => p.verification_status === "pending").length;

  const uploadReceipt = useMutation({
    mutationFn: async ({ charge, file, amount, payment_date, method, reference }: any) => {
      const path = `${user!.id}/${charge.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("payment-receipts").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("tuition_payments").insert({
        charge_id: charge.id, user_id: user!.id, amount: Number(amount),
        currency: charge.currency, payment_date, method, reference: reference || null,
        receipt_path: path, uploaded_by_student: true, verification_status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-charges"] });
      qc.invalidateQueries({ queryKey: ["student-payments"] });
      setUploadFor(null);
      toast.success("Receipt uploaded — awaiting admin verification");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const downloadReceipt = async (path: string) => {
    const { data, error } = await supabase.storage.from("payment-receipts").createSignedUrl(path, 60);
    if (error || !data) { toast.error("Could not load receipt"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const statusBadge = (charge: any) => {
    const due = charge.due_date && new Date(charge.due_date) < new Date() && charge.status !== "paid" && charge.status !== "waived";
    if (charge.status === "paid") return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20 dark:text-emerald-400">Paid</Badge>;
    if (charge.status === "waived") return <Badge variant="secondary">Waived</Badge>;
    if (due) return <Badge variant="destructive">Overdue</Badge>;
    if (charge.status === "partial") return <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/20 dark:text-amber-400">Partial</Badge>;
    return <Badge variant="outline">Unpaid</Badge>;
  };

  return (
    <StudentLayout>
      <div className="flex items-center gap-2">
        <CreditCard className="h-6 w-6 text-primary" />
        <h1 className="font-display text-2xl font-bold text-foreground">Tuition & Payments</h1>
      </div>
      <p className="mt-1 text-muted-foreground">Track your tuition fees, payments, and upload payment receipts.</p>

      {/* Stats */}
      <div className="mt-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <Wallet className="mb-2 h-5 w-5 text-primary" />
          <p className="font-display text-2xl font-bold text-foreground">{fmtMoney(totalCharged)}</p>
          <p className="text-xs text-muted-foreground">Total Charged</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <CheckCircle2 className="mb-2 h-5 w-5 text-emerald-600" />
          <p className="font-display text-2xl font-bold text-foreground">{fmtMoney(verifiedPaid)}</p>
          <p className="text-xs text-muted-foreground">Paid</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <AlertTriangle className={`mb-2 h-5 w-5 ${balance > 0 ? "text-destructive" : "text-emerald-600"}`} />
          <p className="font-display text-2xl font-bold text-foreground">{fmtMoney(balance)}</p>
          <p className="text-xs text-muted-foreground">Balance Due</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <Receipt className="mb-2 h-5 w-5 text-amber-600" />
          <p className="font-display text-2xl font-bold text-foreground">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Pending Receipts</p>
        </div>
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h2 className="font-semibold text-destructive">Overdue Payment{overdue.length > 1 ? "s" : ""}</h2>
            <Badge variant="destructive" className="ml-auto">{overdue.length}</Badge>
          </div>
          <p className="text-sm text-destructive/80 mb-3">
            You have {overdue.length} unpaid charge{overdue.length > 1 ? "s" : ""} past the due date. Please settle as soon as possible to avoid academic holds.
          </p>
          <ul className="space-y-2">
            {overdue.map((c: any) => {
              const daysLate = Math.floor((Date.now() - new Date(c.due_date).getTime()) / (1000 * 60 * 60 * 24));
              const paidOnCharge = payments.filter((p: any) => p.charge_id === c.id && p.verification_status === "verified").reduce((s: number, p: any) => s + Number(p.amount), 0);
              const remaining = Number(c.amount) - paidOnCharge;
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg bg-card border border-destructive/20 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{semMap[c.academic_semester_id]?.name || "Tuition"}</p>
                    <p className="text-xs text-destructive">
                      Due {new Date(c.due_date).toLocaleDateString()} · <span className="font-semibold">{daysLate} day{daysLate !== 1 ? "s" : ""} overdue</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-destructive">{fmtMoney(remaining, c.currency)}</p>
                    <Button size="sm" variant="outline" className="h-7 mt-1 text-xs" onClick={() => setUploadFor(c)}>
                      <Upload className="h-3 w-3 mr-1" /> Pay Now
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Charges */}
      <h2 className="mt-8 mb-3 font-display text-lg font-semibold text-foreground">My Charges</h2>
      {charges.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">No tuition charges yet.</div>
      ) : (
        <div className="space-y-3">
          {charges.map((c: any) => {
            const chargePayments = payments.filter((p: any) => p.charge_id === c.id);
            const paid = chargePayments.filter((p: any) => p.verification_status === "verified").reduce((s: number, p: any) => s + Number(p.amount), 0);
            const pct = Number(c.amount) > 0 ? Math.min(100, Math.round((paid / Number(c.amount)) * 100)) : 0;
            return (
              <div key={c.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{semMap[c.academic_semester_id]?.name || "Tuition"}</h3>
                      {statusBadge(c)}
                    </div>
                    {c.due_date && <p className="mt-1 text-sm text-muted-foreground">Due {new Date(c.due_date).toLocaleDateString()}</p>}
                    {c.notes && <p className="mt-1 text-xs text-muted-foreground">{c.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl font-bold text-foreground">{fmtMoney(Number(c.amount), c.currency)}</p>
                    <p className="text-xs text-muted-foreground">Paid: <span className="text-emerald-600 font-medium">{fmtMoney(paid, c.currency)}</span></p>
                  </div>
                </div>
                <Progress value={pct} className="mt-3 h-2" />
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{pct}% paid</span>
                  {c.status !== "paid" && c.status !== "waived" && (
                    <Button size="sm" variant="outline" onClick={() => setUploadFor(c)}>
                      <Upload className="h-3.5 w-3.5 mr-1" /> Upload Receipt
                    </Button>
                  )}
                </div>
                {chargePayments.length > 0 && (
                  <div className="mt-3 border-t border-border pt-3 space-y-1.5">
                    {chargePayments.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span>{new Date(p.payment_date).toLocaleDateString()}</span>
                          <span className="text-muted-foreground capitalize text-xs">· {p.method.replace("_", " ")}</span>
                          {p.reference && <span className="text-muted-foreground text-xs">· {p.reference}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          {p.verification_status === "verified" && <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20 dark:text-emerald-400 text-[10px]">Verified</Badge>}
                          {p.verification_status === "pending" && <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/20 dark:text-amber-400 text-[10px]">Pending</Badge>}
                          {p.verification_status === "rejected" && <Badge variant="destructive" className="text-[10px]">Rejected</Badge>}
                          <span className="font-medium">{fmtMoney(Number(p.amount), p.currency)}</span>
                          {p.receipt_path && <Button size="sm" variant="ghost" onClick={() => downloadReceipt(p.receipt_path)}><FileDown className="h-3.5 w-3.5" /></Button>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Receipt Dialog */}
      <Dialog open={!!uploadFor} onOpenChange={(o) => !o && setUploadFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Payment Receipt</DialogTitle></DialogHeader>
          {uploadFor && <ReceiptForm charge={uploadFor} onCancel={() => setUploadFor(null)} onSubmit={(d: any) => uploadReceipt.mutate({ ...d, charge: uploadFor })} loading={uploadReceipt.isPending} />}
        </DialogContent>
      </Dialog>
    </StudentLayout>
  );
};

const ReceiptForm = ({ charge, onCancel, onSubmit, loading }: any) => {
  const [form, setForm] = useState({ amount: charge.amount, payment_date: new Date().toISOString().slice(0, 10), method: "bank_transfer", reference: "" });
  const [file, setFile] = useState<File | null>(null);
  return (
    <>
      <div className="space-y-3">
        <div className="rounded-lg bg-muted p-3 text-sm">
          <p className="text-muted-foreground text-xs">Charge amount: <span className="font-medium text-foreground">{fmtMoney(Number(charge.amount), charge.currency)}</span></p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Amount Paid</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value as any })} /></div>
          <div><Label>Payment Date</Label><Input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} /></div>
        </div>
        <div>
          <Label>Method</Label>
          <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Reference (optional)</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Transaction ID, etc." /></div>
        <div>
          <Label>Receipt File</Label>
          <Input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <p className="mt-1 text-xs text-muted-foreground">PDF or image. Will be reviewed by admin.</p>
        </div>
      </div>
      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => file && onSubmit({ ...form, file })} disabled={!file || loading}>{loading ? "Uploading..." : "Submit"}</Button>
      </DialogFooter>
    </>
  );
};

export default StudentTuition;
