import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const fmtMoney = (n: number, c: string = "EUR") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n || 0);

const FONT_FAMILY: Record<string, string> = {
  script: "'Brush Script MT', 'Lucida Handwriting', cursive",
  italic: "'Times New Roman', serif",
  bold: "'Helvetica', sans-serif",
};

interface SignatureConfig {
  enabled: boolean;
  admin_name: string;
  title: string;
  label: string;
  signature_text: string;
  signature_font: "script" | "italic" | "bold";
  signature_size?: number;
  signature_offset_x?: number;
  signature_offset_y?: number;
}

const LateFeeReceipt = () => {
  const { lateFeeId } = useParams();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["late-fee-receipt", lateFeeId],
    queryFn: async () => {
      const { data: lateFee, error } = await supabase
        .from("tuition_late_fees")
        .select("*")
        .eq("id", lateFeeId!)
        .maybeSingle();
      if (error) throw error;
      if (!lateFee) return null;

      const [{ data: charge }, { data: profile }, { data: sigRow }] = await Promise.all([
        supabase.from("tuition_charges").select("*").eq("id", lateFee.charge_id).maybeSingle(),
        supabase
          .from("profiles")
          .select("full_name, email, student_id, program")
          .eq("user_id", lateFee.user_id)
          .maybeSingle(),
        supabase
          .from("system_settings")
          .select("value")
          .eq("key", "transcript_signature")
          .maybeSingle(),
      ]);

      let semester: any = null;
      if (charge?.academic_semester_id) {
        const { data: s } = await supabase
          .from("academic_semesters")
          .select("name, enrollment_deadline, year, semester")
          .eq("id", charge.academic_semester_id)
          .maybeSingle();
        semester = s;
      }

      return {
        lateFee,
        charge,
        profile,
        semester,
        signature: (sigRow?.value as unknown as SignatureConfig | null) ?? null,
      };
    },
    enabled: !!lateFeeId && !!user,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!data?.lateFee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="rounded-xl border border-border bg-card p-8 text-center max-w-md">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <h1 className="font-display text-xl font-bold text-foreground">Receipt not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This late fee receipt does not exist or you do not have access to it.
          </p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/portal/tuition">Back to tuition</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { lateFee, charge, profile, semester, signature } = data;
  const appliedAt = new Date(lateFee.applied_at);
  const deadline = semester?.enrollment_deadline ? new Date(semester.enrollment_deadline) : null;
  const daysLate = deadline
    ? Math.max(0, Math.floor((appliedAt.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24)))
    : null;
  const receiptNo = `LF-${lateFee.id.slice(0, 8).toUpperCase()}`;

  const sigEnabled = signature?.enabled && (signature.admin_name || signature.signature_text);
  const sigText = signature?.signature_text || signature?.admin_name || "";
  const sigFont = signature?.signature_font || "script";

  return (
    <div className="min-h-screen bg-muted/30 py-8 print:bg-white print:py-0">
      {/* Toolbar — hidden when printing */}
      <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between px-4 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link to="/portal/tuition">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to tuition
          </Link>
        </Button>
        <Button onClick={() => window.print()} size="sm">
          <Printer className="mr-1.5 h-4 w-4" /> Print / Save as PDF
        </Button>
      </div>

      {/* Receipt sheet */}
      <div className="mx-auto max-w-3xl bg-card p-10 shadow-sm print:max-w-none print:shadow-none print:p-12 print:bg-white border border-border print:border-0 rounded-xl print:rounded-none">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-foreground pb-5">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Western Balkans University
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Bursar's Office — Tuition Statement</p>
          </div>
          <div className="text-right">
            <p className="font-display text-lg font-bold uppercase tracking-wider text-foreground">
              Late Fee Receipt
            </p>
            <p className="mt-1 text-xs text-muted-foreground">No. {receiptNo}</p>
          </div>
        </div>

        {/* Meta grid */}
        <div className="mt-6 grid grid-cols-2 gap-y-3 gap-x-8 text-sm">
          <MetaRow label="Student name" value={profile?.full_name || "—"} />
          <MetaRow label="Student ID" value={profile?.student_id || "—"} />
          <MetaRow label="Program" value={profile?.program || "—"} />
          <MetaRow label="Email" value={profile?.email || "—"} />
          <MetaRow label="Issue date" value={new Date().toLocaleDateString()} />
          <MetaRow label="Fee applied on" value={appliedAt.toLocaleDateString()} />
        </div>

        {/* Body: the charge */}
        <div className="mt-8">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Charge details
          </h2>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-4 py-2.5 font-semibold text-foreground">Description</th>
                  <th className="px-4 py-2.5 font-semibold text-foreground text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">Late enrollment fee</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {semester?.name ? `For ${semester.name}. ` : ""}
                      {deadline
                        ? `Enrollment deadline was ${deadline.toLocaleDateString()}${
                            daysLate !== null ? ` (${daysLate} day${daysLate !== 1 ? "s" : ""} late).` : "."
                          }`
                        : "Applied due to late course registration."}
                    </p>
                    {lateFee.reason && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">{lateFee.reason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                    {fmtMoney(Number(lateFee.amount), lateFee.currency)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-muted/40 border-t-2 border-foreground">
                  <td className="px-4 py-3 font-display font-bold text-foreground">Total</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-foreground">
                    {fmtMoney(Number(lateFee.amount), lateFee.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {lateFee.waived && (
            <p className="mt-3 rounded-md bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              This late fee has been waived
              {lateFee.waived_at ? ` on ${new Date(lateFee.waived_at).toLocaleDateString()}` : ""}.
            </p>
          )}

          {charge?.due_date && (
            <p className="mt-4 text-xs text-muted-foreground">
              Linked tuition charge due {new Date(charge.due_date).toLocaleDateString()} —{" "}
              {fmtMoney(Number(charge.amount), charge.currency)} (current status:{" "}
              <span className="capitalize">{charge.status}</span>).
            </p>
          )}
        </div>

        {/* Notice */}
        <div className="mt-8 rounded-lg bg-muted/40 p-4 text-xs text-muted-foreground">
          This receipt confirms that a late enrollment fee has been applied to the student's tuition
          account. Payment should be made through the Student Portal or the Bursar's Office. Please
          retain this document for your records.
        </div>

        {/* Signature block */}
        <div className="mt-10 flex items-end justify-between gap-10">
          <div className="text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Issued electronically</p>
            <p>Generated on {new Date().toLocaleString()}</p>
          </div>

          {sigEnabled ? (
            <div className="text-center">
              <div
                className="mb-1 text-3xl text-foreground"
                style={{
                  fontFamily: FONT_FAMILY[sigFont],
                  fontStyle: sigFont === "italic" ? "italic" : "normal",
                  fontWeight: sigFont === "bold" ? 700 : 400,
                }}
              >
                {sigText}
              </div>
              <div className="w-56 border-t border-foreground pt-1 text-xs">
                <p className="font-semibold text-foreground">{signature?.admin_name}</p>
                <p className="text-muted-foreground">{signature?.title}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {signature?.label}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="h-10" />
              <div className="w-56 border-t border-foreground pt-1 text-xs">
                <p className="font-semibold text-foreground">Administrator</p>
                <p className="text-muted-foreground">Bursar's Office</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 0.5in; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
};

const MetaRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="font-medium text-foreground">{value}</p>
  </div>
);

export default LateFeeReceipt;
