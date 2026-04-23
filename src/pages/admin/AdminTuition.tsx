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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CreditCard, Plus, Trash2, CheckCircle2, XCircle, AlertCircle, Wallet, Receipt, FileDown } from "lucide-react";

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
      const { data } = await supabase.from("profiles").select("user_id, full_name, email, student_id, program").order("full_name");
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

  const studentMap = Object.fromEntries(students.map((s: any) => [s.user_id, s]));
  const semesterMap = Object.fromEntries(semesters.map((s: any) => [s.id, s]));

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
    mutationFn: async (semesterId: string) => {
      const semFees = fees.filter((f: any) => f.academic_semester_id === semesterId);
      if (!semFees.length) throw new Error("No program fees defined for this semester");
      const rows: any[] = [];
      for (const fee of semFees) {
        const targets = students.filter((s: any) => s.program === fee.program);
        for (const s of targets) {
          rows.push({
            user_id: s.user_id, academic_semester_id: semesterId, program: fee.program,
            amount: fee.amount, currency: fee.currency, due_date: fee.due_date,
          });
        }
      }
      if (!rows.length) return 0;
      // Insert one-by-one to skip dup conflicts
      let created = 0;
      for (const r of rows) {
        const { error } = await supabase.from("tuition_charges").insert(r);
        if (!error) created++;
      }
      return created;
    },
    onSuccess: (n) => { qc.invalidateQueries({ queryKey: ["adm-tuition-charges"] }); toast.success(`${n} charges generated`); },
    onError: (e: any) => toast.error(e.message),
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

  // Stats
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

      <Tabs defaultValue="charges" className="mt-8">
        <TabsList>
          <TabsTrigger value="charges">Charges</TabsTrigger>
          <TabsTrigger value="payments">Payments {pendingReceipts > 0 && <Badge className="ml-2">{pendingReceipts}</Badge>}</TabsTrigger>
          <TabsTrigger value="fees">Program Fees</TabsTrigger>
        </TabsList>

        {/* CHARGES TAB */}
        <TabsContent value="charges" className="mt-4">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
              <h2 className="font-semibold text-foreground">Student Charges</h2>
              <div className="flex gap-2">
                <Select onValueChange={(v) => generateForSemester.mutate(v)}>
                  <SelectTrigger className="w-[260px]"><SelectValue placeholder="Generate charges for semester…" /></SelectTrigger>
                  <SelectContent>
                    {semesters.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
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
                              <Button size="sm" variant="outline" onClick={() => verifyPayment.mutate({ id: p.id, status: "verified" })}><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /></Button>
                              <Button size="sm" variant="outline" onClick={() => { const note = prompt("Reason for rejection (optional):") || ""; verifyPayment.mutate({ id: p.id, status: "rejected", note }); }}><XCircle className="h-3.5 w-3.5 text-destructive" /></Button>
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
      </Tabs>

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
