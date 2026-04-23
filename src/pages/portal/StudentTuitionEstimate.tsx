import { useMemo, useState } from "react";
import StudentLayout from "@/components/StudentLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Calculator, GraduationCap, Percent, Wallet, Info, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const fmtMoney = (n: number, c: string = "EUR") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n || 0);

const StudentTuitionEstimate = () => {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["est-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("program, scholarship_percentage, full_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["est-programs"],
    queryFn: async () => {
      const { data } = await supabase.from("programs").select("slug, title").order("title");
      return data || [];
    },
  });

  const { data: semesters = [] } = useQuery({
    queryKey: ["est-semesters"],
    queryFn: async () => {
      const { data } = await supabase
        .from("academic_semesters")
        .select("id, name, is_current, year, semester")
        .order("year", { ascending: false })
        .order("semester", { ascending: false });
      return data || [];
    },
  });

  const { data: fees = [] } = useQuery({
    queryKey: ["est-fees"],
    queryFn: async () => {
      const { data } = await supabase.from("program_tuition_fees").select("*");
      return data || [];
    },
  });

  // Local state — prefilled from the student's profile
  const [program, setProgram] = useState<string>("");
  const [semesterId, setSemesterId] = useState<string>("");
  const [scholarship, setScholarship] = useState<number>(0);
  const [initialised, setInitialised] = useState(false);

  // Initialise once profile + semesters arrive
  if (!initialised && profile) {
    setProgram(profile.program || "");
    setScholarship(Number(profile.scholarship_percentage || 0));
    const current = semesters.find((s: any) => s.is_current) || semesters[0];
    if (current) setSemesterId(current.id);
    setInitialised(true);
  }

  const fee = useMemo(
    () => fees.find((f: any) => f.program === program && f.academic_semester_id === semesterId),
    [fees, program, semesterId]
  );
  const annual = Number(fee?.amount || 0);
  const currency = fee?.currency || "EUR";
  const pct = Math.max(0, Math.min(100, scholarship));
  const discount = +(annual * pct / 100).toFixed(2);
  const netAnnual = +(annual - discount).toFixed(2);

  // Same logic as bulk-generate: 4 installments, last absorbs rounding
  const baseInst = Math.floor((netAnnual / 4) * 100) / 100;
  const installments = [baseInst, baseInst, baseInst, +(netAnnual - baseInst * 3).toFixed(2)];

  const baseDue = fee?.due_date ? new Date(fee.due_date) : null;
  const installmentDates = installments.map((_, idx) => {
    if (!baseDue) return null;
    const d = new Date(baseDue);
    d.setMonth(d.getMonth() + idx);
    return d.toISOString().slice(0, 10);
  });

  const programTitle = programs.find((p: any) => p.slug === program)?.title || program;
  const matchesProfile = profile?.program === program && Number(profile?.scholarship_percentage || 0) === pct;

  return (
    <StudentLayout>
      <div className="flex items-center gap-2">
        <Calculator className="h-6 w-6 text-primary" />
        <h1 className="font-display text-2xl font-bold text-foreground">Tuition Estimate</h1>
      </div>
      <p className="mt-1 text-muted-foreground">
        Preview what your tuition would be — annual fee, scholarship discount, and the 4 installments — before any charges are issued.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Inputs */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-5 h-fit">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Estimate parameters</p>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Program</Label>
            <Select value={program} onValueChange={setProgram}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select a program" /></SelectTrigger>
              <SelectContent>
                {programs.map((p: any) => (
                  <SelectItem key={p.slug} value={p.slug}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {profile?.program && profile.program !== program && (
              <button
                onClick={() => setProgram(profile.program!)}
                className="mt-1.5 text-xs text-primary hover:underline"
              >
                Reset to my program
              </button>
            )}
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Academic semester</Label>
            <Select value={semesterId} onValueChange={setSemesterId}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select a semester" /></SelectTrigger>
              <SelectContent>
                {semesters.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}{s.is_current ? " · current" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Scholarship</Label>
              <span className="text-sm font-semibold text-foreground">{pct}%</span>
            </div>
            <Slider
              className="mt-3"
              value={[pct]}
              min={0}
              max={100}
              step={5}
              onValueChange={(v) => setScholarship(v[0])}
            />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
            </div>
            {profile && Number(profile.scholarship_percentage || 0) !== pct && (
              <button
                onClick={() => setScholarship(Number(profile.scholarship_percentage || 0))}
                className="mt-1.5 text-xs text-primary hover:underline"
              >
                Reset to my scholarship ({Number(profile.scholarship_percentage || 0)}%)
              </button>
            )}
          </div>

          {matchesProfile && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-foreground">
              These values match your enrolled profile — your real charges will use these numbers.
            </div>
          )}
        </div>

        {/* Output */}
        <div className="space-y-5">
          {!program || !semesterId ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
              Pick a program and semester to see your estimate.
            </div>
          ) : !fee ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
              <p className="font-semibold text-foreground">No published fee yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tuition for <span className="font-medium text-foreground">{programTitle}</span> in this semester hasn't been published. Try another semester or check back later.
              </p>
            </div>
          ) : (
            <>
              {/* Headline */}
              <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-card p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Estimate for</p>
                    <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" /> {programTitle}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {semesters.find((s: any) => s.id === semesterId)?.name}
                    </p>
                  </div>
                  {pct > 0 && (
                    <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20 dark:text-emerald-400">
                      <Percent className="h-3 w-3 mr-1" /> {pct}% Scholarship
                    </Badge>
                  )}
                </div>

                <div className="mt-5 grid gap-4 grid-cols-2 md:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Annual tuition</p>
                    <p className="font-display text-xl font-bold text-foreground">{fmtMoney(annual, currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Scholarship discount</p>
                    <p className="font-display text-xl font-bold text-emerald-600">−{fmtMoney(discount, currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">You would pay</p>
                    <p className="font-display text-xl font-bold text-foreground">{fmtMoney(netAnnual, currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Per installment (×4)</p>
                    <p className="font-display text-xl font-bold text-foreground">{fmtMoney(baseInst, currency)}</p>
                  </div>
                </div>
              </div>

              {/* Installment breakdown */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Wallet className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-foreground">4 Installment Plan</h3>
                </div>

                {netAnnual <= 0 ? (
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
                    <p className="font-semibold text-emerald-700 dark:text-emerald-400">No payment due</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      With a {pct}% scholarship, your tuition would be fully covered.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {installments.map((amt, idx) => (
                      <div key={idx} className="rounded-lg border border-border bg-muted/30 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">Installment {idx + 1}</p>
                          <Badge variant="outline" className="text-[10px]">Estimate</Badge>
                        </div>
                        <p className="mt-1 font-display text-2xl font-bold text-foreground">{fmtMoney(amt, currency)}</p>
                        {installmentDates[idx] && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Estimated due {new Date(installmentDates[idx]!).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <p className="mt-4 text-xs text-muted-foreground">
                  Estimates are based on the published program fee and your scholarship percentage. Actual installment dates are set when charges are generated by the administration.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/portal/tuition"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  View my actual charges <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </StudentLayout>
  );
};

export default StudentTuitionEstimate;
