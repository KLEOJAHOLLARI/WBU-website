-- Add lecture hours per session/week to support hour-based attendance
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS hours_per_week integer NOT NULL DEFAULT 2;

ALTER TABLE public.attendance_sessions
  ADD COLUMN IF NOT EXISTS hours integer NOT NULL DEFAULT 2;

-- Backfill existing sessions with the course's hours_per_week
UPDATE public.attendance_sessions s
SET hours = COALESCE(c.hours_per_week, 2)
FROM public.courses c
WHERE s.course_id = c.id
  AND (s.hours IS NULL OR s.hours = 0);

-- Settings table for system-wide attendance threshold (and future settings)
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view settings" ON public.system_settings;
CREATE POLICY "Anyone authenticated can view settings"
  ON public.system_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert settings" ON public.system_settings;
CREATE POLICY "Admins can insert settings"
  ON public.system_settings FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update settings" ON public.system_settings;
CREATE POLICY "Admins can update settings"
  ON public.system_settings FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete settings" ON public.system_settings;
CREATE POLICY "Admins can delete settings"
  ON public.system_settings FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default attendance threshold
INSERT INTO public.system_settings (key, value)
VALUES ('attendance_threshold', '{"percent": 75}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Trigger to auto-set session hours from course hours_per_week when not provided
CREATE OR REPLACE FUNCTION public.set_session_hours_default()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.hours IS NULL OR NEW.hours <= 0 THEN
    SELECT COALESCE(hours_per_week, 2) INTO NEW.hours
    FROM public.courses WHERE id = NEW.course_id;
    IF NEW.hours IS NULL OR NEW.hours <= 0 THEN
      NEW.hours := 2;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_session_hours_default ON public.attendance_sessions;
CREATE TRIGGER trg_set_session_hours_default
BEFORE INSERT ON public.attendance_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_session_hours_default();