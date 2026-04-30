
-- Allow users to update their own non-anonymous complaints while still actionable
CREATE POLICY "Users update own active complaints"
ON public.complaint_submissions
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND is_anonymous = false
  AND status IN ('open', 'in_review')
)
WITH CHECK (
  user_id = auth.uid()
  AND is_anonymous = false
  AND status IN ('open', 'in_review', 'cancelled')
);

-- Allow users to delete (cancel) their own active complaints
CREATE POLICY "Users delete own active complaints"
ON public.complaint_submissions
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND is_anonymous = false
  AND status IN ('open', 'in_review')
);

-- Trigger: prevent users from editing protected fields and only allow safe transitions
CREATE OR REPLACE FUNCTION public.guard_complaint_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip enforcement for admins
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Non-admin users cannot change ownership or admin fields
  NEW.user_id := OLD.user_id;
  NEW.is_anonymous := OLD.is_anonymous;
  NEW.admin_response := OLD.admin_response;
  NEW.responded_by := OLD.responded_by;
  NEW.responded_at := OLD.responded_at;
  NEW.created_at := OLD.created_at;

  -- Users may only set status to 'cancelled' (or leave unchanged)
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
    NEW.status := OLD.status;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_complaint_user_update_trg ON public.complaint_submissions;
CREATE TRIGGER guard_complaint_user_update_trg
BEFORE UPDATE ON public.complaint_submissions
FOR EACH ROW
EXECUTE FUNCTION public.guard_complaint_user_update();
