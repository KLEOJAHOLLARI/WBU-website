
CREATE TABLE public.emergency_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  audience_role text NOT NULL DEFAULT 'all',
  audience_program text,
  channels text[] NOT NULL DEFAULT ARRAY['in_app']::text[],
  sent_by uuid NOT NULL,
  delivery_stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_alerts TO authenticated;
GRANT ALL ON public.emergency_alerts TO service_role;

ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage emergency alerts"
  ON public.emergency_alerts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "authenticated users view active alerts"
  ON public.emergency_alerts FOR SELECT TO authenticated
  USING (is_active = true);

CREATE TRIGGER emergency_alerts_touch
  BEFORE UPDATE ON public.emergency_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
