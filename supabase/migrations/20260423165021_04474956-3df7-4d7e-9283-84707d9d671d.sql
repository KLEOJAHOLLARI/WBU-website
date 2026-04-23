-- Late fee settings (singleton via key in system_settings is possible, but use a dedicated table for clarity)
CREATE TABLE IF NOT EXISTS public.tuition_late_fee_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT false,
  fee_type text NOT NULL DEFAULT 'fixed', -- 'fixed' or 'percent'
  amount numeric NOT NULL DEFAULT 0,      -- EUR if fixed, % if percent
  grace_days integer NOT NULL DEFAULT 7,
  max_fee numeric,                         -- optional cap for percent
  currency text NOT NULL DEFAULT 'EUR',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.tuition_late_fee_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view late fee settings"
ON public.tuition_late_fee_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert late fee settings"
ON public.tuition_late_fee_settings FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update late fee settings"
ON public.tuition_late_fee_settings FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete late fee settings"
ON public.tuition_late_fee_settings FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Track late fees applied per charge
CREATE TABLE IF NOT EXISTS public.tuition_late_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id uuid NOT NULL REFERENCES public.tuition_charges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  applied_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  waived boolean NOT NULL DEFAULT false,
  waived_by uuid,
  waived_at timestamptz,
  created_by uuid,
  UNIQUE (charge_id)
);

ALTER TABLE public.tuition_late_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage late fees"
ON public.tuition_late_fees FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students view own late fees"
ON public.tuition_late_fees FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Seed a default settings row (disabled)
INSERT INTO public.tuition_late_fee_settings (enabled, fee_type, amount, grace_days)
SELECT false, 'fixed', 25, 7
WHERE NOT EXISTS (SELECT 1 FROM public.tuition_late_fee_settings);