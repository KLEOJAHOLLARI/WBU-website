
-- =========================================================
-- 1. ACADEMIC CALENDAR EVENTS
-- =========================================================
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL DEFAULT 'event', -- holiday, deadline, ceremony, exam, event
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TEXT,
  end_time TEXT,
  location TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#3b82f6',
  audience TEXT NOT NULL DEFAULT 'all', -- all, students, professors, admins, program
  program TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view published calendar events"
  ON public.calendar_events FOR SELECT TO authenticated
  USING (is_published = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage calendar events"
  ON public.calendar_events FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 2. ROOMS & ROOM BOOKINGS
-- =========================================================
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  building TEXT NOT NULL DEFAULT '',
  floor TEXT NOT NULL DEFAULT '',
  capacity INTEGER NOT NULL DEFAULT 30,
  room_type TEXT NOT NULL DEFAULT 'classroom', -- classroom, lab, auditorium, meeting
  equipment TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view rooms"
  ON public.rooms FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage rooms"
  ON public.rooms FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.room_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  requested_by UUID NOT NULL,
  purpose TEXT NOT NULL,
  booking_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, cancelled
  notes TEXT NOT NULL DEFAULT '',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.room_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all bookings"
  ON public.room_bookings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users view own bookings"
  ON public.room_bookings FOR SELECT TO authenticated
  USING (requested_by = auth.uid());

CREATE POLICY "Professors create bookings"
  ON public.room_bookings FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid() AND
    (has_role(auth.uid(), 'professor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Users cancel own pending bookings"
  ON public.room_bookings FOR UPDATE TO authenticated
  USING (requested_by = auth.uid() AND status = 'pending');

CREATE TRIGGER room_bookings_updated_at
  BEFORE UPDATE ON public.room_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_room_bookings_date ON public.room_bookings(room_id, booking_date);

-- =========================================================
-- 3. COMPLAINT / SUGGESTION BOX
-- =========================================================
CREATE TABLE public.complaint_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- nullable for anonymous
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  submitter_name TEXT NOT NULL DEFAULT '',
  submitter_email TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general', -- complaint, suggestion, facility, academic, general
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open, in_review, resolved, closed
  priority TEXT NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  admin_response TEXT,
  responded_by UUID,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.complaint_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit complaint"
  ON public.complaint_submissions FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins view all complaints"
  ON public.complaint_submissions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users view own non-anonymous complaints"
  ON public.complaint_submissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND is_anonymous = false);

CREATE POLICY "Admins update complaints"
  ON public.complaint_submissions FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete complaints"
  ON public.complaint_submissions FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER complaint_submissions_updated_at
  BEFORE UPDATE ON public.complaint_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 4. PUSH NOTIFICATION CENTER
-- =========================================================
CREATE TABLE public.push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  audience_role TEXT NOT NULL DEFAULT 'all', -- all, user, professor, admin
  audience_program TEXT,
  audience_year INTEGER,
  sent_by UUID NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage push notifications"
  ON public.push_notifications FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated view notifications matching them"
  ON public.push_notifications FOR SELECT TO authenticated
  USING (true);

CREATE TABLE public.push_notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL,
  user_id UUID NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(notification_id, user_id)
);
ALTER TABLE public.push_notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users mark own reads"
  ON public.push_notification_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users view own reads"
  ON public.push_notification_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins view all reads"
  ON public.push_notification_reads FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
