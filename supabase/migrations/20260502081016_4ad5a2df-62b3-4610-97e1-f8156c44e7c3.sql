
-- =====================================================
-- 1. Modify enrollments to support multiple attempts
-- =====================================================
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS attempt_number int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_retake boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_enrollment_id uuid REFERENCES public.enrollments(id) ON DELETE SET NULL;

-- Drop old unique constraints (both names exist per \d output)
ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS enrollments_user_course_unique;
ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS enrollments_user_id_course_id_key;

-- New unique: per-attempt
CREATE UNIQUE INDEX IF NOT EXISTS enrollments_user_course_attempt_unique
  ON public.enrollments(user_id, course_id, attempt_number);

-- =====================================================
-- 2. course_retake_requests table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.course_retake_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  original_enrollment_id uuid REFERENCES public.enrollments(id) ON DELETE SET NULL,
  target_semester_id uuid REFERENCES public.academic_semesters(id) ON DELETE SET NULL,
  attempt_number int NOT NULL DEFAULT 2,
  previous_grade numeric,
  previous_albanian int,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected | cancelled
  advisor_comment text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  fee_amount numeric DEFAULT 0,
  fee_currency text DEFAULT 'EUR',
  fee_charge_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_retake_user ON public.course_retake_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_retake_course ON public.course_retake_requests(course_id);
CREATE INDEX IF NOT EXISTS idx_retake_status ON public.course_retake_requests(status);

ALTER TABLE public.course_retake_requests ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_retake_updated_at ON public.course_retake_requests;
CREATE TRIGGER trg_retake_updated_at
  BEFORE UPDATE ON public.course_retake_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
CREATE POLICY "Students view own retake requests"
  ON public.course_retake_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Students create own retake requests"
  ON public.course_retake_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students cancel own pending retake requests"
  ON public.course_retake_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status IN ('pending', 'cancelled'));

CREATE POLICY "Students delete own pending retake requests"
  ON public.course_retake_requests FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Advisors view program retake requests"
  ON public.course_retake_requests FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.courses c
    JOIN public.program_advisors pa ON pa.program = c.program
    WHERE c.id = course_retake_requests.course_id
      AND pa.advisor_id = auth.uid()
  ));

CREATE POLICY "Advisors update program retake requests"
  ON public.course_retake_requests FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.courses c
    JOIN public.program_advisors pa ON pa.program = c.program
    WHERE c.id = course_retake_requests.course_id
      AND pa.advisor_id = auth.uid()
  ));

CREATE POLICY "Admins manage all retake requests"
  ON public.course_retake_requests FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 3. Trigger: when a retake request is approved, create a NEW enrollment row
-- =====================================================
CREATE OR REPLACE FUNCTION public.auto_enroll_on_retake_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_attempt int;
  v_new_attempt int;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    -- Compute next attempt number for this (user, course)
    SELECT COALESCE(MAX(attempt_number), 0) INTO v_max_attempt
      FROM public.enrollments
      WHERE user_id = NEW.user_id AND course_id = NEW.course_id;
    v_new_attempt := v_max_attempt + 1;

    INSERT INTO public.enrollments (user_id, course_id, attempt_number, is_retake, original_enrollment_id)
    VALUES (NEW.user_id, NEW.course_id, v_new_attempt, true, NEW.original_enrollment_id)
    ON CONFLICT (user_id, course_id, attempt_number) DO NOTHING;

    NEW.attempt_number := v_new_attempt;
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_retake_approved ON public.course_retake_requests;
CREATE TRIGGER trg_retake_approved
  BEFORE UPDATE ON public.course_retake_requests
  FOR EACH ROW EXECUTE FUNCTION public.auto_enroll_on_retake_approved();

-- =====================================================
-- 4. Helper: get user's failed courses (latest attempt below pass)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_failed_courses(_user_id uuid)
RETURNS TABLE (
  enrollment_id uuid,
  course_id uuid,
  attempt_number int,
  weighted_percent numeric,
  albanian int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH per_enrollment AS (
    SELECT
      e.id AS enrollment_id,
      e.course_id,
      e.attempt_number,
      -- Weighted percentage across all components that have at least one score
      CASE
        WHEN SUM(CASE WHEN gc.weight IS NOT NULL AND comp_avg.avg_pct IS NOT NULL THEN gc.weight ELSE 0 END) > 0
        THEN SUM(CASE WHEN comp_avg.avg_pct IS NOT NULL THEN comp_avg.avg_pct * gc.weight ELSE 0 END)
             / NULLIF(SUM(CASE WHEN comp_avg.avg_pct IS NOT NULL THEN gc.weight ELSE 0 END), 0)
        ELSE NULL
      END AS weighted_percent,
      -- complete = every component has at least one score
      COUNT(gc.id) AS total_components,
      COUNT(comp_avg.avg_pct) AS graded_components
    FROM public.enrollments e
    LEFT JOIN public.grade_components gc ON gc.course_id = e.course_id
    LEFT JOIN LATERAL (
      SELECT AVG((g.score / NULLIF(g.max_score,0)) * 100) AS avg_pct
      FROM public.grades g
      WHERE g.enrollment_id = e.id
        AND g.grade_component_id = gc.id
        AND g.score IS NOT NULL
    ) comp_avg ON true
    WHERE e.user_id = _user_id
    GROUP BY e.id, e.course_id, e.attempt_number
  ),
  latest_attempt AS (
    SELECT DISTINCT ON (course_id) *
    FROM per_enrollment
    ORDER BY course_id, attempt_number DESC
  )
  SELECT la.enrollment_id, la.course_id, la.attempt_number,
         ROUND(la.weighted_percent::numeric, 2),
         CASE
           WHEN la.weighted_percent IS NULL THEN NULL
           WHEN la.weighted_percent >= 90 THEN 10
           WHEN la.weighted_percent >= 85 THEN 9
           WHEN la.weighted_percent >= 75 THEN 8
           WHEN la.weighted_percent >= 65 THEN 7
           WHEN la.weighted_percent >= 55 THEN 6
           WHEN la.weighted_percent >= 45 THEN 5
           ELSE 4
         END
  FROM latest_attempt la
  WHERE la.total_components > 0
    AND la.graded_components = la.total_components
    AND la.weighted_percent IS NOT NULL
    AND la.weighted_percent < 45;
END;
$$;

-- =====================================================
-- 5. Default retake settings row
-- =====================================================
INSERT INTO public.system_settings (key, value)
VALUES (
  'retake_settings',
  jsonb_build_object(
    'enabled', true,
    'max_attempts', 3,
    'fee_amount', 0,
    'fee_currency', 'EUR'
  )
)
ON CONFLICT (key) DO NOTHING;
