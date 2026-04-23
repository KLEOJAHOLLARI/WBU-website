
-- 1. Per-program tuition fees per semester
CREATE TABLE public.program_tuition_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program TEXT NOT NULL,
  academic_semester_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(program, academic_semester_id)
);

ALTER TABLE public.program_tuition_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view program fees"
  ON public.program_tuition_fees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert program fees"
  ON public.program_tuition_fees FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update program fees"
  ON public.program_tuition_fees FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete program fees"
  ON public.program_tuition_fees FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_program_tuition_fees_updated_at
  BEFORE UPDATE ON public.program_tuition_fees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Per-student tuition charges
CREATE TABLE public.tuition_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  academic_semester_id UUID NOT NULL,
  program TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'unpaid', -- unpaid | partial | paid | waived
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, academic_semester_id)
);

ALTER TABLE public.tuition_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own charges"
  ON public.tuition_charges FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins view all charges"
  ON public.tuition_charges FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert charges"
  ON public.tuition_charges FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update charges"
  ON public.tuition_charges FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete charges"
  ON public.tuition_charges FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_tuition_charges_updated_at
  BEFORE UPDATE ON public.tuition_charges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_tuition_charges_user ON public.tuition_charges(user_id);
CREATE INDEX idx_tuition_charges_semester ON public.tuition_charges(academic_semester_id);

-- 3. Payments against charges
CREATE TABLE public.tuition_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id UUID NOT NULL REFERENCES public.tuition_charges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  method TEXT NOT NULL DEFAULT 'bank_transfer', -- bank_transfer | cash | card | other
  reference TEXT,
  receipt_path TEXT,
  uploaded_by_student BOOLEAN NOT NULL DEFAULT false,
  verification_status TEXT NOT NULL DEFAULT 'verified', -- pending | verified | rejected
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tuition_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own payments"
  ON public.tuition_payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins view all payments"
  ON public.tuition_payments FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Students insert own pending payments"
  ON public.tuition_payments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND uploaded_by_student = true
    AND verification_status = 'pending'
  );
CREATE POLICY "Admins insert payments"
  ON public.tuition_payments FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update payments"
  ON public.tuition_payments FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete payments"
  ON public.tuition_payments FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_tuition_payments_updated_at
  BEFORE UPDATE ON public.tuition_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_tuition_payments_charge ON public.tuition_payments(charge_id);
CREATE INDEX idx_tuition_payments_user ON public.tuition_payments(user_id);

-- 4. Auto-recalc charge status when payments change (only verified payments count)
CREATE OR REPLACE FUNCTION public.recalc_tuition_charge_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_charge_id UUID;
  v_amount NUMERIC;
  v_paid NUMERIC;
  v_current_status TEXT;
BEGIN
  v_charge_id := COALESCE(NEW.charge_id, OLD.charge_id);

  SELECT amount, status INTO v_amount, v_current_status
    FROM tuition_charges WHERE id = v_charge_id;
  IF NOT FOUND THEN RETURN COALESCE(NEW, OLD); END IF;

  -- Don't auto-flip "waived" charges
  IF v_current_status = 'waived' THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
    FROM tuition_payments
    WHERE charge_id = v_charge_id AND verification_status = 'verified';

  UPDATE tuition_charges
    SET status = CASE
      WHEN v_paid <= 0 THEN 'unpaid'
      WHEN v_paid < v_amount THEN 'partial'
      ELSE 'paid'
    END
    WHERE id = v_charge_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_recalc_charge_status
  AFTER INSERT OR UPDATE OR DELETE ON public.tuition_payments
  FOR EACH ROW EXECUTE FUNCTION public.recalc_tuition_charge_status();

-- 5. Storage bucket for receipts (private)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('payment-receipts', 'payment-receipts', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Students upload own receipts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Students view own receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins view all receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins delete receipts"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND has_role(auth.uid(), 'admin'::app_role)
  );
