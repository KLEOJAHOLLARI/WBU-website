
-- Events
CREATE TABLE public.campus_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  location text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  capacity int NOT NULL DEFAULT 0,
  image_url text,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','cancelled')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campus_events TO authenticated;
GRANT ALL ON public.campus_events TO service_role;

ALTER TABLE public.campus_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view published events"
  ON public.campus_events FOR SELECT
  TO authenticated
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage events insert"
  ON public.campus_events FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage events update"
  ON public.campus_events FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage events delete"
  ON public.campus_events FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_campus_events_updated
  BEFORE UPDATE ON public.campus_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tickets
CREATE TABLE public.event_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.campus_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  ticket_code text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(9), 'hex'),
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','checked_in','cancelled')),
  checked_in_at timestamptz,
  checked_in_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX idx_event_tickets_event ON public.event_tickets(event_id);
CREATE INDEX idx_event_tickets_user ON public.event_tickets(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_tickets TO authenticated;
GRANT ALL ON public.event_tickets TO service_role;

ALTER TABLE public.event_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own or admin views all tickets"
  ON public.event_tickets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'professor'::app_role));

CREATE POLICY "Users reserve own ticket"
  ON public.event_tickets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users cancel own or admin updates"
  ON public.event_tickets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'professor'::app_role))
  WITH CHECK (user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'professor'::app_role));

CREATE POLICY "Admins delete tickets"
  ON public.event_tickets FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_event_tickets_updated
  BEFORE UPDATE ON public.event_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Capacity guard
CREATE OR REPLACE FUNCTION public.enforce_event_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cap int;
  v_count int;
  v_status text;
BEGIN
  SELECT capacity, status INTO v_cap, v_status FROM campus_events WHERE id = NEW.event_id;
  IF v_status <> 'published' THEN
    RAISE EXCEPTION 'Event is not open for reservations';
  END IF;
  IF v_cap > 0 THEN
    SELECT COUNT(*) INTO v_count FROM event_tickets WHERE event_id = NEW.event_id AND status <> 'cancelled';
    IF v_count >= v_cap THEN
      RAISE EXCEPTION 'Event is sold out';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_event_capacity
  BEFORE INSERT ON public.event_tickets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_event_capacity();
