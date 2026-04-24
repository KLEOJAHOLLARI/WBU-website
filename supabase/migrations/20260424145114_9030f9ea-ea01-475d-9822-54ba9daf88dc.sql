-- Message templates
CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage message templates"
ON public.message_templates FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_message_templates_updated_at
BEFORE UPDATE ON public.message_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Scheduled announcements (admin-scheduled bulk messages)
CREATE TABLE public.scheduled_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body text NOT NULL,
  target_programs text[] NOT NULL DEFAULT '{}',
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | sent | failed | cancelled
  sent_at timestamptz,
  recipient_count integer NOT NULL DEFAULT 0,
  error_message text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage scheduled announcements"
ON public.scheduled_announcements FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_scheduled_announcements_updated_at
BEFORE UPDATE ON public.scheduled_announcements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_scheduled_announcements_status_time
ON public.scheduled_announcements (status, scheduled_for);