import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CreditCard, Plus, Trash2, CheckCircle2, XCircle, AlertCircle, Wallet, Receipt, FileDown, Gavel, Settings2, Undo2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

type Charge = {
  id: string; user_id: string; academic_semester_id: string; program: string;
  amount: number; currency: string; due_date: string | null; status: string; notes: string | null;
};
type Payment = {
  id: string; charge_id: string; user_id: string; amount: number; currency: string;
  payment_date: string; method: string; reference: string | null; receipt_path: string | null;
  uploaded_by_student: boolean; verification_status: string; admin_note: string | null; created_at: string;
};

const statusBadge = (status: string, dueDate: string | null) => {
  const overdue = dueDate && new Date(dueDate) < new Date() && status !== "paid" && status !== "waived";
  if (status === "paid") return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20 dark:text-emerald-400">Paid</Badge>;
  if (status === "waived") return <Badge variant="secondary">Waived</Badge>;
  if (overdue) return <Badge variant="destructive">Overdue</Badge>;
  if (status === "partial") return <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/20 dark:text-amber-400">Partial</Badge>;
  return <Badge variant="outline">Unpaid</Badge>;
};

const fmtMoney = (n: number, c: string = "EUR") => new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n || 0);

const AdminTuition = () => {
  const qc = useQueryClient();
  const [feeDialog, setFeeDialog] = useState<any | null>(null);
  const [chargeDialog, setChargeDialog] = useState<any | null>(null);
  const [payDialog, setPayDialog] = useState<{ charge: Charge; student: any } | null>(null);
  const [viewCharge, setViewCharge] = useState<{ charge: Charge; student: any } | null>(null);
  const [reviewDialog, setReviewDialog] = useState<{ payment: Payment; mode: "verify" | "reject" } | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [bulkDialog, setBulkDialog] = useState<{ semesterId: string; program: string; skipExisting: boolean } | null>(null);
  const [lateFeeSettingsDraft, setLateFeeSettingsDraft] = useState<any | null>(null);
  const [applyLateFeesOpen, setApplyLateFeesOpen] = useState(false);
  const [editLateFee, setEditLateFee] = useState<any | null>(null);
  const [lfSearch, setLfSearch] = useState("");
  const [lfStatus, setLfStatus] = useState<"all" | "active" | "waived">("all");
  const [lfFrom, setLfFrom] = useState<string>("");
  const [lfTo, setLfTo] = useState<string>("");
  const [lfSelected, setLfSelected] = useState<Set<string>>(new Set());
  const [bulkLfDialog, setBulkLfDialog] = useState<null | "waive" | "remove">(null);

  const { data: semesters = [] } = useQuery({
    queryKey: ["adm-tuition-semesters"],
    queryFn: async () => {
      const { data } = await supabase.from("academic_semesters").select("*").order("year", { ascending: false }).order("semester", { ascending: false });
      return data || [];
    },
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["adm-tuition-programs"],
    queryFn: async () => {
      const { data } = await supabase.from("programs").select("slug, title").order("title");
      return data || [];
    },
  });

  const { data: fees = [] } = useQuery({
    queryKey: ["adm-tuition-fees"],
    queryFn: async () => {
      const { data } = await supabase.from("program_tuition_fees").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ["adm-tuition-students"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name, email, student_id, program, scholarship_percentage, has_scholarship").order("full_name");
      return (data || []).filter((p: any) => p.program);
    },
  });

  const { data: charges = [] } = useQuery({
    queryKey: ["adm-tuition-charges"],
    queryFn: async () => {
      const { data } = await supabase.from("tuition_charges").select("*").order("due_date", { ascending: true, nullsFirst: false });
      return (data || []) as Charge[];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["adm-tuition-payments"],
    queryFn: async () => {
      const { data } = await supabase.from("tuition_payments").select("*").order("created_at", { ascending: false });
      return (data || []) as Payment[];
    },
  });

  const { data: lateFeeSettings } = useQuery({
    queryKey: ["adm-late-fee-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("tuition_late_fee_settings").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: lateFees = [] } = useQuery({
    queryKey: ["adm-late-fees"],
    queryFn: async () => {
      const { data } = await supabase.from("tuition_late_fees").select("*").order("applied_at", { ascending: false });
      return data || [];
    },
  });

  const studentMap = Object.fromEntries(students.map((s: any) => [s.user_id, s]));
  const semesterMap = Object.fromEntries(semesters.map((s: any) => [s.id, s]));
  const lateFeeByCharge = Object.fromEntries(lateFees.map((lf: any) => [lf.charge_id, lf]));

  // Mutations
  const upsertFee = useMutation({
    mutationFn: async (f: any) => {
      const payload = { program: f.program, academic_semester_id: f.academic_semester_id, amount: Number(f.amount), currency: f.currency || "EUR", due_date: f.due_date || null, notes: f.notes || null };
      if (f.id) {
        const { error } = await supabase.from("program_tuition_fees").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("program_tuition_fees").upsert(payload, { onConflict: "program,academic_semester_id" });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["adm-tuition-fees"] }); setFeeDialog(null); toast.success("Fee saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteFee = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("program_tuition_fees").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["adm-tuition-fees"] }); toast.success("Fee deleted"); },
  });

  const generateForSemester = useMutation({
    mutationFn: async ({ semesterId, program, skipExisting }: { semesterId: string; program: string; skipExisting: boolean }) => {
      const semFees = fees.filter((f: any) =>
        f.academic_semester_id === semesterId && (program === "all" || f.program === program)
      );
      if (!semFees.length) throw new Error("No program fees defined for this selection");

      // Existing keys (user|program|semester) — skip students who already have ANY installment
      const existingKeys = new Set(
        skipExisting
          ? charges
              .filter((c) => c.academic_semester_id === semesterId)
              .map((c) => `${c.user_id}|${c.program}`)
          : []
      );

      const rows: any[] = [];
      for (const fee of semFees) {
        const targets = students.filter((s: any) => s.program === fee.program);
        for (const s of targets) {
          if (skipExisting && existingKeys.has(`${s.user_id}|${fee.program}`)) continue;

          const scholarshipPct = Math.max(0, Math.min(100, Number(s.scholarship_percentage || 0)));
          const annual = Number(fee.amount) || 0;
          const netAnnual = +(annual * (100 - scholarshipPct) / 100).toFixed(2);
          if (netAnnual <= 0) continue; // 100% scholarship => no charges

          // Split into 4 installments (last one absorbs rounding remainder)
          const base = Math.floor((netAnnual / 4) * 100) / 100;
          const installments = [base, base, base, +(netAnnual - base * 3).toFixed(2)];

          // Due dates: fee.due_date as installment 1, +1mo, +2mo, +3mo
          const baseDue = fee.due_date ? new Date(fee.due_date) : null;
          installments.forEach((amt, idx) => {
            const due = baseDue
              ? (() => { const d = new Date(baseDue); d.setMonth(d.getMonth() + idx); return d.toISOString().slice(0, 10); })()
              : null;
            rows.push({
              user_id: s.user_id, academic_semester_id: semesterId, program: fee.program,
              amount: amt, currency: fee.currency, due_date: due,
              notes: `Installment ${idx + 1} of 4 · Annual ${fmtMoney(annual, fee.currency)}${scholarshipPct ? ` · Scholarship ${scholarshipPct}%` : ""}`,
            });
          });
        }
      }
      if (!rows.length) return { created: 0, skipped: 0 };
      let created = 0, skipped = 0;
      for (const r of rows) {
        const { error } = await supabase.from("tuition_charges").insert(r);
        if (error) skipped++; else created++;
      }
      return { created, skipped };
    },
    onSuccess: ({ created, skipped }) => {
      qc.invalidateQueries({ queryKey: ["adm-tuition-charges"] });
      setBulkDialog(null);
      toast.success(`${created} installment${created !== 1 ? "s" : ""} generated${skipped ? ` · ${skipped} skipped` : ""}`);
    },
    onError: (e: any) => { toast.error(e.message); },
  });

  const upsertCharge = useMutation({
    mutationFn: async (c: any) => {
      const payload = { user_id: c.user_id, academic_semester_id: c.academic_semester_id, program: c.program, amount: Number(c.amount), currency: c.currency || "EUR", due_date: c.due_date || null, notes: c.notes || null, status: c.status || "unpaid" };
      if (c.id) {
        const { error } = await supabase.from("tuition_charges").update(payload).eq("id", c.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tuition_charges").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["adm-tuition-charges"] }); setChargeDialog(null); toast.success("Charge saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCharge = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("tuition_charges").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["adm-tuition-charges"] }); qc.invalidateQueries({ queryKey: ["adm-tuition-payments"] }); toast.success("Charge deleted"); },
  });

  const recordPayment = useMutation({
    mutationFn: async (p: any) => {
      const payload = {
        charge_id: p.charge_id, user_id: p.user_id, amount: Number(p.amount), currency: p.currency || "EUR",
        payment_date: p.payment_date, method: p.method, reference: p.reference || null,
        verification_status: "verified", uploaded_by_student: false, admin_note: p.admin_note || null,
      };
      const { error } = await supabase.from("tuition_payments").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adm-tuition-payments"] });
      qc.invalidateQueries({ queryKey: ["adm-tuition-charges"] });
      setPayDialog(null);
      toast.success("Payment recorded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const verifyPayment = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: "verified" | "rejected"; note?: string }) => {
      const { error } = await supabase.from("tuition_payments").update({ verification_status: status, admin_note: note ?? null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adm-tuition-payments"] });
      qc.invalidateQueries({ queryKey: ["adm-tuition-charges"] });
      toast.success("Payment updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deletePayment = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("tuition_payments").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adm-tuition-payments"] });
      qc.invalidateQueries({ queryKey: ["adm-tuition-charges"] });
      toast.success("Payment deleted");
    },
  });

  // ===== LATE FEE LOGIC =====
  const computeLateFee = (chargeAmount: number, settings: any) => {
    if (!settings || !settings.enabled) return 0;
    const raw = settings.fee_type === "percent"
      ? +(Number(chargeAmount) * Number(settings.amount) / 100).toFixed(2)
      : Number(settings.amount);
    const capped = settings.max_fee != null ? Math.min(raw, Number(settings.max_fee)) : raw;
    return Math.max(0, +capped.toFixed(2));
  };

  // For preview: which charges would get a NEW late fee right now
  const eligibleForLateFee = (() => {
    if (!lateFeeSettings?.enabled) return [];
    const grace = Number(lateFeeSettings.grace_days || 0);
    const cutoff = Date.now() - grace * 24 * 60 * 60 * 1000;
    return charges.filter((c) => {
      if (!c.due_date) return false;
      if (c.status === "paid" || c.status === "waived") return false;
      if (new Date(c.due_date).getTime() > cutoff) return false;
      const existing = lateFeeByCharge[c.id];
      return !existing || existing.waived; // re-apply only if previously waived? skip — only if none exists
    }).filter((c) => !lateFeeByCharge[c.id]); // never duplicate; UNIQUE on charge_id
  })();

  const eligiblePreviewTotal = eligibleForLateFee.reduce((s, c) => s + computeLateFee(Number(c.amount), lateFeeSettings), 0);

  const saveLateFeeSettings = useMutation({
    mutationFn: async (s: any) => {
      const payload = {
        enabled: !!s.enabled,
        fee_type: s.fee_type === "percent" ? "percent" : "fixed",
        amount: Number(s.amount) || 0,
        grace_days: Math.max(0, Math.floor(Number(s.grace_days) || 0)),
        max_fee: s.max_fee === "" || s.max_fee == null ? null : Number(s.max_fee),
        currency: s.currency || "EUR",
        updated_at: new Date().toISOString(),
      };
      if (s.id) {
        const { error } = await supabase.from("tuition_late_fee_settings").update(payload).eq("id", s.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tuition_late_fee_settings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adm-late-fee-settings"] });
      setLateFeeSettingsDraft(null);
      toast.success("Late fee settings saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const applyLateFees = useMutation({
    mutationFn: async () => {
      if (!lateFeeSettings?.enabled) throw new Error("Late fees are disabled");
      let applied = 0, skipped = 0;
      for (const c of eligibleForLateFee) {
        const fee = computeLateFee(Number(c.amount), lateFeeSettings);
        if (fee <= 0) { skipped++; continue; }
        const reason = `${lateFeeSettings.fee_type === "percent" ? `${lateFeeSettings.amount}% of ${fmtMoney(Number(c.amount), c.currency)}` : `Flat fee`} after ${lateFeeSettings.grace_days}-day grace period`;
        const { error } = await supabase.from("tuition_late_fees").insert({
          charge_id: c.id, user_id: c.user_id, amount: fee, currency: c.currency, reason,
        });
        if (error) skipped++; else applied++;
      }
      return { applied, skipped };
    },
    onSuccess: ({ applied, skipped }) => {
      qc.invalidateQueries({ queryKey: ["adm-late-fees"] });
      setApplyLateFeesOpen(false);
      toast.success(`Applied ${applied} late fee${applied !== 1 ? "s" : ""}${skipped ? ` · ${skipped} skipped` : ""}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const waiveLateFee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tuition_late_fees")
        .update({ waived: true, waived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["adm-late-fees"] }); toast.success("Late fee waived"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteLateFee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tuition_late_fees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["adm-late-fees"] }); toast.success("Late fee removed"); },
  });

  const bulkWaiveLateFees = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return { count: 0 };
      const { error } = await supabase.from("tuition_late_fees")
        .update({ waived: true, waived_at: new Date().toISOString() })
        .in("id", ids)
        .eq("waived", false);
      if (error) throw error;
      return { count: ids.length };
    },
    onSuccess: ({ count }) => {
      qc.invalidateQueries({ queryKey: ["adm-late-fees"] });
      setBulkLfDialog(null);
      setLfSelected(new Set());
      toast.success(`Waived ${count} late fee${count !== 1 ? "s" : ""}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkDeleteLateFees = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return { count: 0 };
      const { error } = await supabase.from("tuition_late_fees").delete().in("id", ids);
      if (error) throw error;
      return { count: ids.length };
    },
    onSuccess: ({ count }) => {
      qc.invalidateQueries({ queryKey: ["adm-late-fees"] });
      setBulkLfDialog(null);
      setLfSelected(new Set());
      toast.success(`Removed ${count} late fee${count !== 1 ? "s" : ""}`);
    },
    onError: (e: any) => toast.error(e.message),
  });


  const updateLateFeeNotes = useMutation({
    mutationFn: async (lf: { id: string; reason: string; waive_note: string; waived: boolean }) => {
      // Schema only has `reason`. Persist active reason and waive note in a single field
      // using a clear separator so it round-trips on subsequent edits.
      const SEP = "\n— Waive note: ";
      const combined = lf.waived && lf.waive_note.trim()
        ? `${lf.reason.trim()}${SEP}${lf.waive_note.trim()}`
        : lf.reason.trim();
      const { error } = await supabase.from("tuition_late_fees")
        .update({ reason: combined })
        .eq("id", lf.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adm-late-fees"] });
      setEditLateFee(null);
      toast.success("Late fee updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const splitLateFeeReason = (raw: string | null) => {
    const SEP = "\n— Waive note: ";
    if (!raw) return { reason: "", waive_note: "" };
    const idx = raw.indexOf(SEP);
    if (idx === -1) return { reason: raw, waive_note: "" };
    return { reason: raw.slice(0, idx), waive_note: raw.slice(idx + SEP.length) };
  };

  const totalCharged = charges.reduce((s, c) => s + Number(c.amount), 0);
  const verifiedPayments = payments.filter((p) => p.verification_status === "verified");
  const totalCollected = verifiedPayments.reduce((s, p) => s + Number(p.amount), 0);
  const overdueCount = charges.filter((c) => c.due_date && new Date(c.due_date) < new Date() && c.status !== "paid" && c.status !== "waived").length;
  const pendingReceipts = payments.filter((p) => p.verification_status === "pending").length;

  const downloadReceipt = async (path: string) => {
    const { data, error } = await supabase.storage.from("payment-receipts").createSignedUrl(path, 60);
    if (error || !data) { toast.error("Could not load receipt"); return; }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <AdminLayout>
      <div className="flex items-center gap-2">
        <CreditCard className="h-6 w-6 text-primary" />
        <h1 className="font-display text-2xl font-bold text-foreground">Tuition & Payments</h1>
      </div>
      <p className="mt-1 text-muted-foreground">Manage program fees, student charges, and payments.</p>

      {/* Stats */}
      <div className="mt-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <Wallet className="mb-2 h-5 w-5 text-primary" />
          <p className="font-display text-2xl font-bold text-foreground">{fmtMoney(totalCharged)}</p>
          <p className="text-xs text-muted-foreground">Total Charged</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <CheckCircle2 className="mb-2 h-5 w-5 text-emerald-600" />
          <p className="font-display text-2xl font-bold text-foreground">{fmtMoney(totalCollected)}</p>
          <p className="text-xs text-muted-foreground">Collected</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <AlertCircle className="mb-2 h-5 w-5 text-destructive" />
          <p className="font-display text-2xl font-bold text-foreground">{overdueCount}</p>
          <p className="text-xs text-muted-foreground">Overdue Charges</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <Receipt className="mb-2 h-5 w-5 text-amber-600" />
          <p className="font-display text-2xl font-bold text-foreground">{pendingReceipts}</p>
          <p className="text-xs text-muted-foreground">Pending Receipts</p>
        </div>
      </div>

      <Tabs defaultValue="queue" className="mt-8">
        <TabsList>
          <TabsTrigger value="queue">
            Receipt Queue {pendingReceipts > 0 && <Badge className="ml-2">{pendingReceipts}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="charges">Charges</TabsTrigger>
          <TabsTrigger value="payments">All Payments</TabsTrigger>
          <TabsTrigger value="fees">Program Fees</TabsTrigger>
          <TabsTrigger value="latefees">
            Late Fees {lateFeeSettings?.enabled && eligibleForLateFee.length > 0 && <Badge variant="destructive" className="ml-2">{eligibleForLateFee.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* RECEIPT QUEUE TAB */}
        <TabsContent value="queue" className="mt-4">
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border p-4">
              <h2 className="font-semibold text-foreground">Student-Uploaded Receipts — Pending Review</h2>
              <p className="text-sm text-muted-foreground mt-1">Approve or reject student proof-of-payment uploads. Approved payments automatically apply to the charge.</p>
            </div>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.filter((p) => p.uploaded_by_student && p.verification_status === "pending").length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No receipts awaiting review. 🎉</TableCell></TableRow>
                  )}
                  {payments.filter((p) => p.uploaded_by_student && p.verification_status === "pending").map((p) => {
                    const st = studentMap[p.user_id];
                    const charge = charges.find((c) => c.id === p.charge_id);
                    const sem = charge ? semesterMap[charge.academic_semester_id] : null;
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">{st?.full_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{st?.student_id || st?.email}</div>
                          {sem && <div className="text-xs text-muted-foreground mt-0.5">{sem.name}</div>}
                        </TableCell>
                        <TableCell className="text-sm">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm">{new Date(p.payment_date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{fmtMoney(Number(p.amount), p.currency)}</TableCell>
                        <TableCell className="text-sm capitalize">{p.method.replace("_", " ")}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.reference || "—"}</TableCell>
                        <TableCell>
                          {p.receipt_path ? (
                            <Button size="sm" variant="outline" onClick={() => downloadReceipt(p.receipt_path!)}>
                              <FileDown className="h-3.5 w-3.5 mr-1" /> View
                            </Button>
                          ) : <span className="text-xs text-muted-foreground">No file</span>}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setReviewNote(p.admin_note || ""); setReviewDialog({ payment: p, mode: "verify" }); }}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => { setReviewNote(p.admin_note || ""); setReviewDialog({ payment: p, mode: "reject" }); }}>
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* CHARGES TAB */}
        <TabsContent value="charges" className="mt-4">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
              <h2 className="font-semibold text-foreground">Student Charges</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const current = semesters.find((s: any) => s.is_current) || semesters[0];
                    if (!current) { toast.error("Create an academic semester first"); return; }
                    setBulkDialog({ semesterId: current.id, program: "all", skipExisting: true });
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Bulk Generate
                </Button>
                <Button onClick={() => setChargeDialog({})}><Plus className="h-4 w-4 mr-1" /> New Charge</Button>
              </div>
            </div>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {charges.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No charges yet.</TableCell></TableRow>}
                  {charges.map((c) => {
                    const st = studentMap[c.user_id];
                    const sem = semesterMap[c.academic_semester_id];
                    const paid = verifiedPayments.filter((p) => p.charge_id === c.id).reduce((s, p) => s + Number(p.amount), 0);
                    return (
                      <TableRow key={c.id} className="cursor-pointer" onClick={() => setViewCharge({ charge: c, student: st })}>
                        <TableCell>
                          <div className="font-medium text-foreground">{st?.full_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{st?.student_id || st?.email}</div>
                        </TableCell>
                        <TableCell className="text-sm">{sem?.name || "—"}</TableCell>
                        <TableCell className="font-medium">{fmtMoney(Number(c.amount), c.currency)}</TableCell>
                        <TableCell className="text-emerald-600 font-medium">{fmtMoney(paid, c.currency)}</TableCell>
                        <TableCell className="text-sm">{c.due_date ? new Date(c.due_date).toLocaleDateString() : "—"}</TableCell>
                        <TableCell>{statusBadge(c.status, c.due_date)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setPayDialog({ charge: c, student: st }); }}>Record Payment</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* PAYMENTS TAB */}
        <TabsContent value="payments" className="mt-4">
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border p-4">
              <h2 className="font-semibold text-foreground">All Payments</h2>
            </div>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No payments yet.</TableCell></TableRow>}
                  {payments.map((p) => {
                    const st = studentMap[p.user_id];
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">{st?.full_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{st?.student_id || st?.email}</div>
                        </TableCell>
                        <TableCell className="text-sm">{new Date(p.payment_date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{fmtMoney(Number(p.amount), p.currency)}</TableCell>
                        <TableCell className="text-sm capitalize">{p.method.replace("_", " ")}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.reference || "—"}</TableCell>
                        <TableCell className="text-sm">{p.uploaded_by_student ? <Badge variant="outline">Student</Badge> : <Badge variant="secondary">Admin</Badge>}</TableCell>
                        <TableCell>
                          {p.verification_status === "verified" && <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20 dark:text-emerald-400">Verified</Badge>}
                          {p.verification_status === "pending" && <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/20 dark:text-amber-400">Pending</Badge>}
                          {p.verification_status === "rejected" && <Badge variant="destructive">Rejected</Badge>}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          {p.receipt_path && (
                            <Button size="sm" variant="outline" onClick={() => downloadReceipt(p.receipt_path!)}><FileDown className="h-3.5 w-3.5" /></Button>
                          )}
                          {p.verification_status === "pending" && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => { setReviewNote(p.admin_note || ""); setReviewDialog({ payment: p, mode: "verify" }); }}><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /></Button>
                              <Button size="sm" variant="outline" onClick={() => { setReviewNote(p.admin_note || ""); setReviewDialog({ payment: p, mode: "reject" }); }}><XCircle className="h-3.5 w-3.5 text-destructive" /></Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete payment?")) deletePayment.mutate(p.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* FEES TAB */}
        <TabsContent value="fees" className="mt-4">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="font-semibold text-foreground">Program Fees</h2>
              <Button onClick={() => setFeeDialog({})}><Plus className="h-4 w-4 mr-1" /> New Fee</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Program</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fees.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No program fees defined.</TableCell></TableRow>}
                {fees.map((f: any) => {
                  const sem = semesterMap[f.academic_semester_id];
                  const prog = programs.find((p: any) => p.slug === f.program);
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{prog?.title || f.program}</TableCell>
                      <TableCell>{sem?.name || "—"}</TableCell>
                      <TableCell>{fmtMoney(Number(f.amount), f.currency)}</TableCell>
                      <TableCell>{f.due_date ? new Date(f.due_date).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="outline" onClick={() => setFeeDialog(f)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete fee?")) deleteFee.mutate(f.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* LATE FEES TAB */}
        <TabsContent value="latefees" className="mt-4 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Settings2 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h2 className="font-semibold text-foreground">Late Fee Settings</h2>
                  <p className="text-sm text-muted-foreground">
                    {lateFeeSettings?.enabled ? (
                      <>
                        <span className="text-emerald-600 font-medium">Enabled</span> — {lateFeeSettings.fee_type === "percent"
                          ? `${lateFeeSettings.amount}% of charge`
                          : `${fmtMoney(Number(lateFeeSettings.amount), lateFeeSettings.currency)} flat`} after a {lateFeeSettings.grace_days}-day grace period
                        {lateFeeSettings.max_fee != null && ` (max ${fmtMoney(Number(lateFeeSettings.max_fee), lateFeeSettings.currency)})`}
                      </>
                    ) : <span className="text-muted-foreground">Late fees are currently disabled.</span>}
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={() => setLateFeeSettingsDraft(lateFeeSettings || { enabled: false, fee_type: "fixed", amount: 25, grace_days: 7, currency: "EUR" })}>
                <Settings2 className="h-4 w-4 mr-1" /> Configure
              </Button>
            </div>
          </div>

          {lateFeeSettings?.enabled && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2"><Gavel className="h-4 w-4" /> Apply Late Fees Now</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {eligibleForLateFee.length} overdue charge{eligibleForLateFee.length !== 1 ? "s" : ""} eligible · estimated {fmtMoney(eligiblePreviewTotal, lateFeeSettings.currency)} in fees
                  </p>
                </div>
                <Button onClick={() => setApplyLateFeesOpen(true)} disabled={eligibleForLateFee.length === 0}>
                  <Gavel className="h-4 w-4 mr-1" /> Apply to {eligibleForLateFee.length} Charge{eligibleForLateFee.length !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-foreground">Applied Late Fees</h2>
                {(lfSearch || lfStatus !== "all" || lfFrom || lfTo) && (
                  <Button size="sm" variant="ghost" onClick={() => { setLfSearch(""); setLfStatus("all"); setLfFrom(""); setLfTo(""); }}>
                    Clear filters
                  </Button>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Input
                  placeholder="Search student name, ID or email…"
                  value={lfSearch}
                  onChange={(e) => setLfSearch(e.target.value)}
                />
                <Select value={lfStatus} onValueChange={(v: any) => setLfStatus(v)}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="waived">Waived</SelectItem>
                  </SelectContent>
                </Select>
                <div>
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Input type="date" value={lfFrom} onChange={(e) => setLfFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input type="date" value={lfTo} onChange={(e) => setLfTo(e.target.value)} />
                </div>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const q = lfSearch.trim().toLowerCase();
                  const fromTs = lfFrom ? new Date(lfFrom).setHours(0, 0, 0, 0) : null;
                  const toTs = lfTo ? new Date(lfTo).setHours(23, 59, 59, 999) : null;
                  const filtered = (lateFees as any[]).filter((lf) => {
                    if (lfStatus === "active" && lf.waived) return false;
                    if (lfStatus === "waived" && !lf.waived) return false;
                    const ts = new Date(lf.applied_at).getTime();
                    if (fromTs != null && ts < fromTs) return false;
                    if (toTs != null && ts > toTs) return false;
                    if (q) {
                      const st = studentMap[lf.user_id];
                      const hay = `${st?.full_name || ""} ${st?.student_id || ""} ${st?.email || ""}`.toLowerCase();
                      if (!hay.includes(q)) return false;
                    }
                    return true;
                  });
                  if (filtered.length === 0) {
                    return <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{lateFees.length === 0 ? "No late fees applied yet." : "No late fees match the current filters."}</TableCell></TableRow>;
                  }
                  return filtered.map((lf: any) => {
                  const st = studentMap[lf.user_id];
                  const parsed = splitLateFeeReason(lf.reason);
                  return (
                    <TableRow key={lf.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">{st?.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{st?.student_id || st?.email}</div>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(lf.applied_at).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{fmtMoney(Number(lf.amount), lf.currency)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div>{parsed.reason || "—"}</div>
                        {lf.waived && parsed.waive_note && (
                          <div className="mt-1 text-xs italic">Waive note: {parsed.waive_note}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {lf.waived
                          ? <Badge variant="secondary">Waived</Badge>
                          : <Badge variant="destructive">Active</Badge>}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditLateFee({ ...lf, ...parsed })}
                        >
                          Edit
                        </Button>
                        {!lf.waived && (
                          <Button size="sm" variant="outline" onClick={() => waiveLateFee.mutate(lf.id)}>
                            <Undo2 className="h-3.5 w-3.5 mr-1" /> Waive
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm("Remove this late fee record?")) deleteLateFee.mutate(lf.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                  });
                })()}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Late fee settings dialog */}
      <Dialog open={!!lateFeeSettingsDraft} onOpenChange={(o) => !o && setLateFeeSettingsDraft(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Late Fee Settings</DialogTitle></DialogHeader>
          {lateFeeSettingsDraft && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label className="text-sm">Enable late fees</Label>
                  <p className="text-xs text-muted-foreground">When on, you can apply fees to overdue charges.</p>
                </div>
                <Switch checked={!!lateFeeSettingsDraft.enabled} onCheckedChange={(v) => setLateFeeSettingsDraft({ ...lateFeeSettingsDraft, enabled: v })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Fee type</Label>
                  <Select value={lateFeeSettingsDraft.fee_type} onValueChange={(v) => setLateFeeSettingsDraft({ ...lateFeeSettingsDraft, fee_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed amount</SelectItem>
                      <SelectItem value="percent">Percentage of charge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{lateFeeSettingsDraft.fee_type === "percent" ? "Percent (%)" : "Amount"}</Label>
                  <Input type="number" step="0.01" value={lateFeeSettingsDraft.amount ?? ""} onChange={(e) => setLateFeeSettingsDraft({ ...lateFeeSettingsDraft, amount: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Grace period (days)</Label>
                  <Input type="number" min="0" value={lateFeeSettingsDraft.grace_days ?? 0} onChange={(e) => setLateFeeSettingsDraft({ ...lateFeeSettingsDraft, grace_days: e.target.value })} />
                </div>
                <div>
                  <Label>Max fee (optional cap)</Label>
                  <Input type="number" step="0.01" value={lateFeeSettingsDraft.max_fee ?? ""} onChange={(e) => setLateFeeSettingsDraft({ ...lateFeeSettingsDraft, max_fee: e.target.value })} placeholder="No cap" />
                </div>
              </div>
              <div>
                <Label>Currency</Label>
                <Input value={lateFeeSettingsDraft.currency || "EUR"} onChange={(e) => setLateFeeSettingsDraft({ ...lateFeeSettingsDraft, currency: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLateFeeSettingsDraft(null)}>Cancel</Button>
            <Button onClick={() => saveLateFeeSettings.mutate(lateFeeSettingsDraft)} disabled={saveLateFeeSettings.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply late fees confirmation */}
      <AlertDialog open={applyLateFeesOpen} onOpenChange={setApplyLateFeesOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply late fees?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  This will apply a late fee to <span className="font-semibold text-foreground">{eligibleForLateFee.length}</span> overdue charge{eligibleForLateFee.length !== 1 ? "s" : ""} that are past the {lateFeeSettings?.grace_days}-day grace period.
                </p>
                <p>
                  Estimated total: <span className="font-semibold text-foreground">{fmtMoney(eligiblePreviewTotal, lateFeeSettings?.currency)}</span>
                </p>
                <p className="text-xs">Charges that already have a late fee will be skipped (one fee per charge).</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => applyLateFees.mutate()}>Apply Late Fees</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit late fee reason / waive note dialog */}
      <Dialog open={!!editLateFee} onOpenChange={(o) => !o && setEditLateFee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Late Fee {editLateFee?.waived ? "(Waived)" : ""}</DialogTitle>
          </DialogHeader>
          {editLateFee && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <div className="text-muted-foreground">Student</div>
                <div className="font-medium text-foreground">
                  {studentMap[editLateFee.user_id]?.full_name || "—"}
                </div>
                <div className="mt-2 text-muted-foreground">Amount</div>
                <div className="font-medium text-foreground">
                  {fmtMoney(Number(editLateFee.amount), editLateFee.currency)}
                </div>
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea
                  rows={3}
                  value={editLateFee.reason ?? ""}
                  onChange={(e) => setEditLateFee({ ...editLateFee, reason: e.target.value })}
                  placeholder="Why this late fee was applied"
                />
              </div>
              {editLateFee.waived && (
                <div>
                  <Label>Waive note</Label>
                  <Textarea
                    rows={3}
                    value={editLateFee.waive_note ?? ""}
                    onChange={(e) => setEditLateFee({ ...editLateFee, waive_note: e.target.value })}
                    placeholder="Why this fee was waived (visible to admins)"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLateFee(null)}>Cancel</Button>
            <Button
              onClick={() => editLateFee && updateLateFeeNotes.mutate({
                id: editLateFee.id,
                reason: editLateFee.reason ?? "",
                waive_note: editLateFee.waive_note ?? "",
                waived: !!editLateFee.waived,
              })}
              disabled={updateLateFeeNotes.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fee Dialog */}
      <Dialog open={!!feeDialog} onOpenChange={(o) => !o && setFeeDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{feeDialog?.id ? "Edit Fee" : "New Program Fee"}</DialogTitle></DialogHeader>
          {feeDialog && (
            <div className="space-y-3">
              <div>
                <Label>Program</Label>
                <Select value={feeDialog.program || ""} onValueChange={(v) => setFeeDialog({ ...feeDialog, program: v })}>
                  <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                  <SelectContent>{programs.map((p: any) => <SelectItem key={p.slug} value={p.slug}>{p.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Semester</Label>
                <Select value={feeDialog.academic_semester_id || ""} onValueChange={(v) => setFeeDialog({ ...feeDialog, academic_semester_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
                  <SelectContent>{semesters.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Amount</Label><Input type="number" step="0.01" value={feeDialog.amount ?? ""} onChange={(e) => setFeeDialog({ ...feeDialog, amount: e.target.value })} /></div>
                <div><Label>Currency</Label><Input value={feeDialog.currency || "EUR"} onChange={(e) => setFeeDialog({ ...feeDialog, currency: e.target.value })} /></div>
              </div>
              <div><Label>Due Date</Label><Input type="date" value={feeDialog.due_date || ""} onChange={(e) => setFeeDialog({ ...feeDialog, due_date: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea value={feeDialog.notes || ""} onChange={(e) => setFeeDialog({ ...feeDialog, notes: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeeDialog(null)}>Cancel</Button>
            <Button onClick={() => upsertFee.mutate(feeDialog)} disabled={!feeDialog?.program || !feeDialog?.academic_semester_id}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Charge Dialog */}
      <Dialog open={!!chargeDialog} onOpenChange={(o) => !o && setChargeDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{chargeDialog?.id ? "Edit Charge" : "New Charge"}</DialogTitle></DialogHeader>
          {chargeDialog && (
            <div className="space-y-3">
              <div>
                <Label>Student</Label>
                <Select value={chargeDialog.user_id || ""} onValueChange={(v) => {
                  const s = studentMap[v];
                  setChargeDialog({ ...chargeDialog, user_id: v, program: s?.program || chargeDialog.program });
                }}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>{students.map((s: any) => <SelectItem key={s.user_id} value={s.user_id}>{s.full_name} ({s.student_id || s.email})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Semester</Label>
                <Select value={chargeDialog.academic_semester_id || ""} onValueChange={(v) => setChargeDialog({ ...chargeDialog, academic_semester_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
                  <SelectContent>{semesters.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Amount</Label><Input type="number" step="0.01" value={chargeDialog.amount ?? ""} onChange={(e) => setChargeDialog({ ...chargeDialog, amount: e.target.value })} /></div>
                <div><Label>Currency</Label><Input value={chargeDialog.currency || "EUR"} onChange={(e) => setChargeDialog({ ...chargeDialog, currency: e.target.value })} /></div>
              </div>
              <div><Label>Due Date</Label><Input type="date" value={chargeDialog.due_date || ""} onChange={(e) => setChargeDialog({ ...chargeDialog, due_date: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={chargeDialog.status || "unpaid"} onValueChange={(v) => setChargeDialog({ ...chargeDialog, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="waived">Waived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Textarea value={chargeDialog.notes || ""} onChange={(e) => setChargeDialog({ ...chargeDialog, notes: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setChargeDialog(null)}>Cancel</Button>
            <Button onClick={() => upsertCharge.mutate(chargeDialog)} disabled={!chargeDialog?.user_id || !chargeDialog?.academic_semester_id || !chargeDialog?.program}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={!!payDialog} onOpenChange={(o) => !o && setPayDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          {payDialog && (
            <PaymentForm
              charge={payDialog.charge}
              student={payDialog.student}
              onCancel={() => setPayDialog(null)}
              onSubmit={(data) => recordPayment.mutate({ ...data, charge_id: payDialog.charge.id, user_id: payDialog.charge.user_id, currency: payDialog.charge.currency })}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View charge dialog */}
      <Dialog open={!!viewCharge} onOpenChange={(o) => !o && setViewCharge(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Charge Details</DialogTitle></DialogHeader>
          {viewCharge && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Student</p><p className="font-medium">{viewCharge.student?.full_name}</p></div>
                <div><p className="text-xs text-muted-foreground">Student ID</p><p className="font-medium">{viewCharge.student?.student_id || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Semester</p><p className="font-medium">{semesterMap[viewCharge.charge.academic_semester_id]?.name || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p><div>{statusBadge(viewCharge.charge.status, viewCharge.charge.due_date)}</div></div>
                <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-medium">{fmtMoney(Number(viewCharge.charge.amount), viewCharge.charge.currency)}</p></div>
                <div><p className="text-xs text-muted-foreground">Due</p><p className="font-medium">{viewCharge.charge.due_date ? new Date(viewCharge.charge.due_date).toLocaleDateString() : "—"}</p></div>
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-2">Payments</h3>
                <div className="rounded-lg border border-border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {payments.filter((p) => p.charge_id === viewCharge.charge.id).length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground text-sm">No payments yet.</TableCell></TableRow>}
                      {payments.filter((p) => p.charge_id === viewCharge.charge.id).map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm">{new Date(p.payment_date).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium">{fmtMoney(Number(p.amount), p.currency)}</TableCell>
                          <TableCell className="text-sm capitalize">{p.method.replace("_", " ")}</TableCell>
                          <TableCell className="text-sm">{p.verification_status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => { if (confirm("Delete charge?")) { deleteCharge.mutate(viewCharge.charge.id); setViewCharge(null); } }}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => { setChargeDialog(viewCharge.charge); setViewCharge(null); }}>Edit</Button>
                  <Button onClick={() => { setPayDialog(viewCharge); setViewCharge(null); }}>Record Payment</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt review dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={(o) => { if (!o) { setReviewDialog(null); setReviewNote(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewDialog?.mode === "verify" ? "Approve Payment Receipt" : "Reject Payment Receipt"}</DialogTitle>
          </DialogHeader>
          {reviewDialog && (() => {
            const p = reviewDialog.payment;
            const st = studentMap[p.user_id];
            const charge = charges.find((c) => c.id === p.charge_id);
            const sem = charge ? semesterMap[charge.academic_semester_id] : null;
            return (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                  <p className="font-medium text-foreground">{st?.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{st?.student_id || st?.email}</p>
                  {sem && <p className="text-xs text-muted-foreground">Semester: {sem.name}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-xs">
                    <span><span className="text-muted-foreground">Amount:</span> <span className="font-semibold text-foreground">{fmtMoney(Number(p.amount), p.currency)}</span></span>
                    <span><span className="text-muted-foreground">Date:</span> {new Date(p.payment_date).toLocaleDateString()}</span>
                    <span><span className="text-muted-foreground">Method:</span> <span className="capitalize">{p.method.replace("_", " ")}</span></span>
                    {p.reference && <span><span className="text-muted-foreground">Ref:</span> {p.reference}</span>}
                  </div>
                </div>
                {p.receipt_path && (
                  <Button variant="outline" className="w-full" onClick={() => downloadReceipt(p.receipt_path!)}>
                    <FileDown className="h-4 w-4 mr-2" /> View Uploaded Receipt
                  </Button>
                )}
                <div>
                  <Label>{reviewDialog.mode === "verify" ? "Admin note (optional)" : "Reason for rejection"}</Label>
                  <Textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder={reviewDialog.mode === "verify" ? "e.g. Verified against bank statement" : "e.g. Receipt unreadable, wrong amount, etc."}
                    rows={3}
                  />
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReviewDialog(null); setReviewNote(""); }}>Cancel</Button>
            {reviewDialog?.mode === "verify" ? (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  verifyPayment.mutate(
                    { id: reviewDialog.payment.id, status: "verified", note: reviewNote || undefined },
                    { onSuccess: () => { setReviewDialog(null); setReviewNote(""); } }
                  );
                }}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" /> Approve Payment
              </Button>
            ) : (
              <Button
                variant="destructive"
                disabled={!reviewNote.trim()}
                onClick={() => {
                  verifyPayment.mutate(
                    { id: reviewDialog!.payment.id, status: "rejected", note: reviewNote },
                    { onSuccess: () => { setReviewDialog(null); setReviewNote(""); } }
                  );
                }}
              >
                <XCircle className="h-4 w-4 mr-1" /> Reject Payment
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BULK GENERATE CHARGES DIALOG */}
      <AlertDialog open={!!bulkDialog} onOpenChange={(o) => !o && setBulkDialog(null)}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk Generate Tuition Charges</AlertDialogTitle>
            <AlertDialogDescription>
              Create charges for all eligible students based on the program fees configured for the selected semester.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {bulkDialog && (() => {
            const semFees = fees.filter((f: any) =>
              f.academic_semester_id === bulkDialog.semesterId &&
              (bulkDialog.program === "all" || f.program === bulkDialog.program)
            );
            const programs = Array.from(new Set(fees.filter((f: any) => f.academic_semester_id === bulkDialog.semesterId).map((f: any) => f.program)));
            const existingKeys = new Set(
              charges
                .filter((c) => c.academic_semester_id === bulkDialog.semesterId)
                .map((c) => `${c.user_id}|${c.program}`)
            );
            let eligible = 0, alreadyCharged = 0, totalAmount = 0, fullScholarSkipped = 0;
            for (const fee of semFees) {
              const targets = students.filter((s: any) => s.program === fee.program);
              for (const s of targets) {
                const sch = Math.max(0, Math.min(100, Number(s.scholarship_percentage || 0)));
                const net = Number(fee.amount) * (100 - sch) / 100;
                if (existingKeys.has(`${s.user_id}|${fee.program}`)) {
                  alreadyCharged++;
                  if (!bulkDialog.skipExisting && net > 0) totalAmount += net;
                } else if (net <= 0) {
                  fullScholarSkipped++;
                } else {
                  eligible++;
                  totalAmount += net;
                }
              }
            }
            const studentsToCharge = bulkDialog.skipExisting ? eligible : eligible + alreadyCharged;
            const toCreate = studentsToCharge * 4; // 4 installments per student
            const semName = semesters.find((s: any) => s.id === bulkDialog.semesterId)?.name || "—";

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Semester</Label>
                    <Select
                      value={bulkDialog.semesterId}
                      onValueChange={(v) => setBulkDialog({ ...bulkDialog, semesterId: v, program: "all" })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {semesters.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Program</Label>
                    <Select value={bulkDialog.program} onValueChange={(v) => setBulkDialog({ ...bulkDialog, program: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All programs</SelectItem>
                        {programs.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={bulkDialog.skipExisting}
                    onCheckedChange={(v) => setBulkDialog({ ...bulkDialog, skipExisting: !!v })}
                  />
                  Skip students who already have a charge for this semester
                </label>

                <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Semester</span><span className="font-medium">{semName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Program fees matched</span><span className="font-medium">{semFees.length}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Eligible students (new)</span><span className="font-medium text-emerald-600">{eligible}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Already charged</span><span className="font-medium text-amber-600">{alreadyCharged}</span></div>
                  {fullScholarSkipped > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Skipped (100% scholarship)</span><span className="font-medium">{fullScholarSkipped}</span></div>
                  )}
                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="font-semibold">Students to charge</span>
                    <span className="font-bold">{studentsToCharge}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Installments to create (×4)</span>
                    <span className="font-bold">{toCreate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Estimated total (after scholarships)</span>
                    <span className="font-bold">{fmtMoney(totalAmount)}</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Each eligible student receives <strong>4 monthly installments</strong> starting on the program fee's due date. Amounts are split after applying each student's scholarship percentage.
                </p>

                {semFees.length === 0 && (
                  <p className="text-sm text-destructive">No program fees defined for this selection. Configure fees first.</p>
                )}
                {toCreate === 0 && semFees.length > 0 && (
                  <p className="text-sm text-muted-foreground">No new charges would be created with the current settings.</p>
                )}
              </div>
            );
          })()}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={generateForSemester.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (bulkDialog) generateForSemester.mutate(bulkDialog);
              }}
            >
              {generateForSemester.isPending ? "Generating…" : "Confirm & Generate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

const PaymentForm = ({ charge, student, onCancel, onSubmit }: any) => {
  const [form, setForm] = useState({ amount: charge.amount, payment_date: new Date().toISOString().slice(0, 10), method: "bank_transfer", reference: "", admin_note: "" });
  return (
    <>
      <div className="space-y-3">
        <div className="rounded-lg bg-muted p-3 text-sm">
          <p className="font-medium">{student?.full_name}</p>
          <p className="text-muted-foreground text-xs">Charge: {fmtMoney(Number(charge.amount), charge.currency)}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Amount</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value as any })} /></div>
          <div><Label>Date</Label><Input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} /></div>
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
        <div><Label>Reference</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Transaction ID, invoice #, etc." /></div>
        <div><Label>Admin Note</Label><Textarea value={form.admin_note} onChange={(e) => setForm({ ...form, admin_note: e.target.value })} /></div>
      </div>
      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSubmit(form)}>Record Payment</Button>
      </DialogFooter>
    </>
  );
};

export default AdminTuition;
