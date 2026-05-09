
-- Track which deadline reminders have been sent for which semester
CREATE TABLE IF NOT EXISTS public.enrollment_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_id uuid NOT NULL,
  reminder_kind text NOT NULL, -- 'opened' | 'deadline_7' | 'deadline_3' | 'deadline_1'
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (semester_id, reminder_kind)
);
ALTER TABLE public.enrollment_reminder_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view reminder log" ON public.enrollment_reminder_log
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Helper: pick a system sender (any admin), needed because push_notifications.sent_by is NOT NULL
CREATE OR REPLACE FUNCTION public.system_admin_uid()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role ORDER BY user_id LIMIT 1;
$$;

-- Trigger function: when enrollment opens (false -> true), broadcast a dashboard notification
CREATE OR REPLACE FUNCTION public.notify_enrollment_opened()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin uuid;
  v_deadline text;
BEGIN
  IF NEW.enrollment_open = true AND COALESCE(OLD.enrollment_open, false) = false THEN
    v_admin := system_admin_uid();
    IF v_admin IS NULL THEN RETURN NEW; END IF;

    v_deadline := CASE
      WHEN NEW.enrollment_deadline IS NOT NULL
        THEN ' Deadline: ' || to_char(NEW.enrollment_deadline, 'Mon DD, YYYY') || '.'
      ELSE ''
    END;

    INSERT INTO public.push_notifications (title, body, link, audience_role, sent_by)
    VALUES (
      'Course registration is now open',
      'Registration for ' || NEW.name || ' is open. Build and submit your course list.' || v_deadline,
      '/portal/registration',
      'user',
      v_admin
    );

    INSERT INTO public.enrollment_reminder_log (semester_id, reminder_kind)
    VALUES (NEW.id, 'opened')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_enrollment_opened ON public.academic_semesters;
CREATE TRIGGER trg_notify_enrollment_opened
AFTER UPDATE OF enrollment_open ON public.academic_semesters
FOR EACH ROW EXECUTE FUNCTION public.notify_enrollment_opened();

-- Daily reminder runner: fires at 7, 3, 1 days before deadline, idempotent
CREATE OR REPLACE FUNCTION public.send_enrollment_deadline_reminders()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sem record;
  v_admin uuid;
  v_today date := (now() at time zone 'UTC')::date;
  v_days int;
  v_kind text;
  v_inserted int := 0;
BEGIN
  v_admin := system_admin_uid();
  IF v_admin IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_admin');
  END IF;

  FOR v_sem IN
    SELECT id, name, enrollment_deadline
    FROM public.academic_semesters
    WHERE enrollment_open = true
      AND enrollment_deadline IS NOT NULL
      AND enrollment_deadline >= v_today
  LOOP
    v_days := v_sem.enrollment_deadline - v_today;
    v_kind := CASE v_days
      WHEN 7 THEN 'deadline_7'
      WHEN 3 THEN 'deadline_3'
      WHEN 1 THEN 'deadline_1'
      WHEN 0 THEN 'deadline_1'
      ELSE NULL
    END;
    IF v_kind IS NULL THEN CONTINUE; END IF;

    BEGIN
      INSERT INTO public.enrollment_reminder_log (semester_id, reminder_kind)
      VALUES (v_sem.id, v_kind);
    EXCEPTION WHEN unique_violation THEN
      CONTINUE;
    END;

    INSERT INTO public.push_notifications (title, body, link, audience_role, sent_by)
    VALUES (
      CASE WHEN v_days <= 1 THEN 'Last day to register for courses'
           ELSE 'Course registration closes in ' || v_days || ' days' END,
      'Registration for ' || v_sem.name || ' closes on ' ||
        to_char(v_sem.enrollment_deadline, 'Mon DD, YYYY') ||
        '. Submit your course list to your Academic Advisor before the deadline.',
      '/portal/registration',
      'user',
      v_admin
    );
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'inserted', v_inserted);
END; $$;

-- Schedule daily at 08:00 UTC
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('enrollment-deadline-reminders');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'enrollment-deadline-reminders',
  '0 8 * * *',
  $$ SELECT public.send_enrollment_deadline_reminders(); $$
);
