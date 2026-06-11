
-- Appointments
CREATE TABLE public.health_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes int NOT NULL DEFAULT 30,
  reason text,
  status text NOT NULL DEFAULT 'scheduled', -- scheduled, completed, cancelled, no_show
  provider_name text,
  location text,
  admin_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_appointments TO authenticated;
GRANT ALL ON public.health_appointments TO service_role;

ALTER TABLE public.health_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all appointments"
  ON public.health_appointments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students view own appointments"
  ON public.health_appointments FOR SELECT
  USING (auth.uid() = student_id);

CREATE TRIGGER trg_health_appt_updated
  BEFORE UPDATE ON public.health_appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_health_appt_student ON public.health_appointments(student_id);
CREATE INDEX idx_health_appt_scheduled ON public.health_appointments(scheduled_at);

-- Visit logs (confidential)
CREATE TABLE public.health_visit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  appointment_id uuid REFERENCES public.health_appointments(id) ON DELETE SET NULL,
  visit_date timestamptz NOT NULL DEFAULT now(),
  chief_complaint text,
  diagnosis text,
  treatment text,
  prescriptions text,
  vitals jsonb,
  follow_up_date date,
  provider_name text,
  visible_to_student boolean NOT NULL DEFAULT false,
  student_summary text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_visit_logs TO authenticated;
GRANT ALL ON public.health_visit_logs TO service_role;

ALTER TABLE public.health_visit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all visit logs"
  ON public.health_visit_logs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students view shared visit summaries"
  ON public.health_visit_logs FOR SELECT
  USING (auth.uid() = student_id AND visible_to_student = true);

CREATE TRIGGER trg_health_visit_updated
  BEFORE UPDATE ON public.health_visit_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_health_visit_student ON public.health_visit_logs(student_id);
CREATE INDEX idx_health_visit_date ON public.health_visit_logs(visit_date);
