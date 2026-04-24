-- Digital Student ID Card system
CREATE TABLE public.student_id_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active', -- active, suspended, expired
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  verification_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  reissue_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.student_id_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own card"
ON public.student_id_cards FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all cards"
ON public.student_id_cards FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_student_id_cards_updated_at
BEFORE UPDATE ON public.student_id_cards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create card when student profile is approved
CREATE OR REPLACE FUNCTION public.auto_create_student_id_card()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.account_status IN ('approved', 'active') AND NEW.student_id IS NOT NULL THEN
    INSERT INTO public.student_id_cards (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_create_student_id_card_trigger
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.auto_create_student_id_card();

-- Backfill cards for existing approved students
INSERT INTO public.student_id_cards (user_id)
SELECT user_id FROM public.profiles
WHERE account_status IN ('approved', 'active') AND student_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Scan history (optional)
CREATE TABLE public.student_id_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.student_id_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  scan_type TEXT NOT NULL DEFAULT 'verification', -- entry, attendance, library, verification
  scanned_by UUID,
  result TEXT NOT NULL DEFAULT 'success', -- success, failed, suspended
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.student_id_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own scans"
ON public.student_id_scans FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins view all scans"
ON public.student_id_scans FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert scans"
ON public.student_id_scans FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));