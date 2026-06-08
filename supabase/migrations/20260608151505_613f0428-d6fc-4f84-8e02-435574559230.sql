
-- Slots
CREATE TABLE public.office_hours_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  location text,
  capacity int NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at),
  CHECK (capacity >= 1)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.office_hours_slots TO authenticated;
GRANT ALL ON public.office_hours_slots TO service_role;
ALTER TABLE public.office_hours_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view slots"
  ON public.office_hours_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Professors manage own slots"
  ON public.office_hours_slots FOR ALL TO authenticated
  USING (professor_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (professor_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_ohs_updated BEFORE UPDATE ON public.office_hours_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bookings
CREATE TABLE public.office_hours_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES public.office_hours_slots(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'booked', -- booked | cancelled
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slot_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.office_hours_bookings TO authenticated;
GRANT ALL ON public.office_hours_bookings TO service_role;
ALTER TABLE public.office_hours_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Student sees own bookings"
  ON public.office_hours_bookings FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.office_hours_slots s WHERE s.id = slot_id AND s.professor_id = auth.uid())
  );
CREATE POLICY "Student creates own booking"
  ON public.office_hours_bookings FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());
CREATE POLICY "Student or professor updates booking"
  ON public.office_hours_bookings FOR UPDATE TO authenticated
  USING (
    student_id = auth.uid()
    OR has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.office_hours_slots s WHERE s.id = slot_id AND s.professor_id = auth.uid())
  );
CREATE POLICY "Student or admin deletes booking"
  ON public.office_hours_bookings FOR DELETE TO authenticated
  USING (student_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_ohb_updated BEFORE UPDATE ON public.office_hours_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notification trigger
CREATE OR REPLACE FUNCTION public.notify_office_hours_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_slot record;
  v_student_name text;
  v_prof_name text;
  v_admin uuid;
  v_when text;
BEGIN
  v_admin := system_admin_uid();
  SELECT * INTO v_slot FROM office_hours_slots WHERE id = COALESCE(NEW.slot_id, OLD.slot_id);
  IF v_slot IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT full_name INTO v_student_name FROM profiles WHERE user_id = COALESCE(NEW.student_id, OLD.student_id);
  SELECT full_name INTO v_prof_name FROM profiles WHERE user_id = v_slot.professor_id;
  v_when := to_char(v_slot.start_at, 'Mon DD, HH24:MI');

  IF TG_OP = 'INSERT' THEN
    INSERT INTO push_notifications (title, body, link, audience_role, target_user_id, sent_by)
    VALUES ('Office hours booked',
      'You booked office hours with ' || COALESCE(v_prof_name,'professor') || ' on ' || v_when || '.',
      '/portal/office-hours', 'user', NEW.student_id, COALESCE(v_admin, NEW.student_id));
    INSERT INTO push_notifications (title, body, link, audience_role, target_user_id, sent_by)
    VALUES ('New office-hours booking',
      COALESCE(v_student_name,'A student') || ' booked your slot on ' || v_when || '.',
      '/professor/office-hours', 'professor', v_slot.professor_id, COALESCE(v_admin, NEW.student_id));
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    INSERT INTO push_notifications (title, body, link, audience_role, target_user_id, sent_by)
    VALUES ('Office hours cancelled',
      'Booking on ' || v_when || ' was cancelled.',
      '/professor/office-hours', 'professor', v_slot.professor_id, COALESCE(v_admin, NEW.student_id));
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER trg_ohb_notify
  AFTER INSERT OR UPDATE ON public.office_hours_bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_office_hours_booking();
