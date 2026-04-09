-- Create enrollment_request_status type
DO $$ BEGIN
  CREATE TYPE public.enrollment_request_status AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Program advisors table (one advisor per program)
CREATE TABLE public.program_advisors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program text NOT NULL UNIQUE,
  advisor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.program_advisors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view advisors"
ON public.program_advisors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert advisors"
ON public.program_advisors FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update advisors"
ON public.program_advisors FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete advisors"
ON public.program_advisors FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_program_advisors_updated_at
BEFORE UPDATE ON public.program_advisors
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enrollment requests table
CREATE TABLE public.enrollment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  status public.enrollment_request_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

ALTER TABLE public.enrollment_requests ENABLE ROW LEVEL SECURITY;

-- Students can view their own requests
CREATE POLICY "Students can view own enrollment requests"
ON public.enrollment_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Students can create enrollment requests
CREATE POLICY "Students can create enrollment requests"
ON public.enrollment_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Advisors can view requests for courses in programs they advise
CREATE POLICY "Advisors can view enrollment requests"
ON public.enrollment_requests FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courses c
    JOIN program_advisors pa ON pa.program = c.program
    WHERE c.id = enrollment_requests.course_id
    AND pa.advisor_id = auth.uid()
  )
);

-- Advisors can update requests for courses in programs they advise
CREATE POLICY "Advisors can update enrollment requests"
ON public.enrollment_requests FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courses c
    JOIN program_advisors pa ON pa.program = c.program
    WHERE c.id = enrollment_requests.course_id
    AND pa.advisor_id = auth.uid()
  )
);

-- Admins can do everything
CREATE POLICY "Admins can view all enrollment requests"
ON public.enrollment_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update enrollment requests"
ON public.enrollment_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete enrollment requests"
ON public.enrollment_requests FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_enrollment_requests_updated_at
BEFORE UPDATE ON public.enrollment_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-enroll student when request is accepted
CREATE OR REPLACE FUNCTION public.auto_enroll_on_request_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    INSERT INTO enrollments (user_id, course_id)
    VALUES (NEW.user_id, NEW.course_id)
    ON CONFLICT DO NOTHING;
  END IF;
  -- If rejected, optionally remove enrollment
  IF NEW.status = 'rejected' AND OLD.status = 'accepted' THEN
    DELETE FROM enrollments 
    WHERE user_id = NEW.user_id AND course_id = NEW.course_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_enroll_on_request_accepted
AFTER UPDATE ON public.enrollment_requests
FOR EACH ROW EXECUTE FUNCTION public.auto_enroll_on_request_accepted();