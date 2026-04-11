
CREATE TABLE public.academic_semesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  enrollment_open boolean NOT NULL DEFAULT false,
  enrollment_deadline date,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.academic_semesters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view semesters"
  ON public.academic_semesters FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert semesters"
  ON public.academic_semesters FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update semesters"
  ON public.academic_semesters FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete semesters"
  ON public.academic_semesters FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_academic_semesters_updated_at
  BEFORE UPDATE ON public.academic_semesters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
