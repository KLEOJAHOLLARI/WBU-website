ALTER TABLE public.campus_events
  ADD COLUMN ticket_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN cancellation_deadline_hours int NOT NULL DEFAULT 24,
  ADD COLUMN refund_policy text;

ALTER TABLE public.event_tickets
  ADD COLUMN cancelled_at timestamptz,
  ADD COLUMN cancellation_reason text,
  ADD COLUMN refund_status text NOT NULL DEFAULT 'none' CHECK (refund_status IN ('none','pending','approved','rejected')),
  ADD COLUMN refunded_at timestamptz;

CREATE OR REPLACE FUNCTION public.validate_event_cancellation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deadline_hours int;
  v_starts_at timestamptz;
  v_price numeric;
  v_is_admin boolean;
BEGIN
  v_is_admin := public.has_role(auth.uid(), 'admin'::app_role);

  SELECT cancellation_deadline_hours, starts_at, ticket_price
    INTO v_deadline_hours, v_starts_at, v_price
    FROM campus_events WHERE id = NEW.event_id;

  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    -- Enforce cancellation deadline for non-admin self-cancellations
    IF NOT v_is_admin AND OLD.user_id = auth.uid() THEN
      IF v_starts_at IS NOT NULL AND now() > (v_starts_at - make_interval(hours => COALESCE(v_deadline_hours, 0))) THEN
        RAISE EXCEPTION 'Cancellation deadline has passed';
      END IF;
    END IF;

    NEW.cancelled_at := now();
    IF COALESCE(v_price, 0) > 0 AND OLD.refund_status = 'none' THEN
      NEW.refund_status := 'pending';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_event_cancellation
  BEFORE UPDATE ON public.event_tickets
  FOR EACH ROW EXECUTE FUNCTION public.validate_event_cancellation();