
-- Gates / scanner devices
CREATE TABLE public.access_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.access_gates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage gates" ON public.access_gates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated view gates" ON public.access_gates
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER trg_gates_updated
  BEFORE UPDATE ON public.access_gates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Access logs
CREATE TABLE public.access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'student',         -- student | professor | staff
  card_type text NOT NULL DEFAULT 'digital',    -- digital | physical
  action text NOT NULL,                         -- check_in | check_out
  status text NOT NULL DEFAULT 'success',       -- success | denied | expired | inactive
  gate_id uuid REFERENCES public.access_gates(id) ON DELETE SET NULL,
  gate_name text NOT NULL DEFAULT 'Main Gate',
  card_id uuid,                                 -- references student or professor card
  verification_token text,
  notes text,
  scanned_by uuid,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_logs_user_scanned ON public.access_logs (user_id, scanned_at DESC);
CREATE INDEX idx_access_logs_scanned_at ON public.access_logs (scanned_at DESC);
CREATE INDEX idx_access_logs_status ON public.access_logs (status);

ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage access logs" ON public.access_logs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users view own access logs" ON public.access_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Seed default gate
INSERT INTO public.access_gates (name, location) VALUES ('Main Gate', 'Building A - Entrance');

-- RPC to record a card scan safely
CREATE OR REPLACE FUNCTION public.record_card_scan(
  _verification_token text,
  _card_type text DEFAULT 'digital',
  _gate_id uuid DEFAULT NULL,
  _gate_name text DEFAULT 'Main Gate',
  _force_action text DEFAULT NULL  -- NULL = auto-toggle, or 'check_in' / 'check_out'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_role text := 'student';
  v_card_id uuid;
  v_card_status text;
  v_last_action text;
  v_action text;
  v_status text := 'success';
  v_log_id uuid;
BEGIN
  -- Match against student card first
  SELECT id, user_id, status INTO v_card_id, v_user_id, v_card_status
    FROM public.student_id_cards WHERE verification_token = _verification_token LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT id, user_id, status INTO v_card_id, v_user_id, v_card_status
      FROM public.professor_id_cards WHERE verification_token = _verification_token LIMIT 1;
    IF v_user_id IS NOT NULL THEN v_role := 'professor'; END IF;
  END IF;

  IF v_user_id IS NULL THEN
    INSERT INTO public.access_logs (user_id, role, card_type, action, status, gate_id, gate_name, verification_token, notes)
      VALUES ('00000000-0000-0000-0000-000000000000', 'unknown', _card_type, 'check_in', 'denied', _gate_id, _gate_name, _verification_token, 'Unknown card')
      RETURNING id INTO v_log_id;
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_card', 'log_id', v_log_id);
  END IF;

  -- Validity checks
  IF v_card_status = 'suspended' THEN v_status := 'inactive';
  ELSIF v_card_status = 'expired' THEN v_status := 'expired';
  END IF;

  -- Determine action
  SELECT action INTO v_last_action FROM public.access_logs
    WHERE user_id = v_user_id AND status = 'success'
    ORDER BY scanned_at DESC LIMIT 1;

  v_action := COALESCE(_force_action,
    CASE WHEN v_last_action = 'check_in' THEN 'check_out' ELSE 'check_in' END);

  INSERT INTO public.access_logs (user_id, role, card_type, action, status, gate_id, gate_name, card_id, verification_token, scanned_by)
    VALUES (v_user_id, v_role, _card_type, v_action, v_status, _gate_id, _gate_name, v_card_id, _verification_token, auth.uid())
    RETURNING id INTO v_log_id;

  RETURN jsonb_build_object('ok', v_status = 'success', 'action', v_action, 'status', v_status, 'log_id', v_log_id, 'user_id', v_user_id, 'role', v_role);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_card_scan(text, text, uuid, text, text) TO authenticated;
