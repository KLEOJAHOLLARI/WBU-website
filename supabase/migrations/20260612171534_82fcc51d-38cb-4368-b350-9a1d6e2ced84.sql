
-- Companies
CREATE TABLE public.internship_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text,
  website text,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  logo_url text,
  description text,
  status text NOT NULL DEFAULT 'active', -- active | inactive
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internship_companies TO authenticated;
GRANT ALL ON public.internship_companies TO service_role;
ALTER TABLE public.internship_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage companies" ON public.internship_companies FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated read active companies" ON public.internship_companies FOR SELECT
  TO authenticated USING (status = 'active' OR has_role(auth.uid(), 'admin'::app_role));

-- Positions
CREATE TABLE public.internship_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.internship_companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  location text,
  work_type text DEFAULT 'onsite', -- onsite | remote | hybrid
  duration text, -- e.g. "3 months"
  capacity int NOT NULL DEFAULT 1,
  program text, -- optional target program
  requirements text,
  application_deadline date,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'open', -- open | closed | draft
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internship_positions TO authenticated;
GRANT ALL ON public.internship_positions TO service_role;
ALTER TABLE public.internship_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage positions" ON public.internship_positions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated read open positions" ON public.internship_positions FOR SELECT
  TO authenticated USING (status = 'open' OR has_role(auth.uid(), 'admin'::app_role));

-- Applications
CREATE TABLE public.internship_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id uuid NOT NULL REFERENCES public.internship_positions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cover_letter text,
  resume_url text,
  status text NOT NULL DEFAULT 'pending', -- pending | reviewing | accepted | rejected | withdrawn
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (position_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internship_applications TO authenticated;
GRANT ALL ON public.internship_applications TO service_role;
ALTER TABLE public.internship_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage applications" ON public.internship_applications FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Students view own applications" ON public.internship_applications FOR SELECT
  TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Students create own applications" ON public.internship_applications FOR INSERT
  TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students withdraw own applications" ON public.internship_applications FOR UPDATE
  TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid() AND status IN ('pending','withdrawn'));

-- Placements
CREATE TABLE public.internship_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES public.internship_applications(id) ON DELETE SET NULL,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position_id uuid NOT NULL REFERENCES public.internship_positions(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.internship_companies(id) ON DELETE CASCADE,
  start_date date,
  end_date date,
  supervisor_name text,
  supervisor_email text,
  status text NOT NULL DEFAULT 'active', -- active | completed | terminated
  evaluation_score numeric,
  evaluation_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internship_placements TO authenticated;
GRANT ALL ON public.internship_placements TO service_role;
ALTER TABLE public.internship_placements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage placements" ON public.internship_placements FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Students view own placements" ON public.internship_placements FOR SELECT
  TO authenticated USING (student_id = auth.uid());

-- updated_at triggers
CREATE TRIGGER trg_intern_companies_updated BEFORE UPDATE ON public.internship_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_intern_positions_updated BEFORE UPDATE ON public.internship_positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_intern_applications_updated BEFORE UPDATE ON public.internship_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_intern_placements_updated BEFORE UPDATE ON public.internship_placements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
