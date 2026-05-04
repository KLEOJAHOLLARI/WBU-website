-- Feedback campaigns (admin-controlled windows)
CREATE TABLE public.feedback_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_id uuid NOT NULL,
  opens_at timestamptz NOT NULL DEFAULT now(),
  closes_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (semester_id)
);

ALTER TABLE public.feedback_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view campaigns"
  ON public.feedback_campaigns FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage campaigns"
  ON public.feedback_campaigns FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_feedback_campaigns_updated
  BEFORE UPDATE ON public.feedback_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Anonymous professor feedback
CREATE TABLE public.professor_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  professor_id uuid NOT NULL,
  semester_id uuid NOT NULL,
  submitter_hash text NOT NULL, -- hash of (user_id, course_id, semester_id) to enforce one-per-student without storing user_id
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submitter_hash)
);

CREATE INDEX idx_prof_feedback_professor ON public.professor_feedback(professor_id);
CREATE INDEX idx_prof_feedback_course ON public.professor_feedback(course_id);
CREATE INDEX idx_prof_feedback_semester ON public.professor_feedback(semester_id);

ALTER TABLE public.professor_feedback ENABLE ROW LEVEL SECURITY;

-- Only admins can directly read rows. Professors and students go through SECURITY DEFINER functions.
CREATE POLICY "Admins view all feedback"
  ON public.professor_feedback FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete feedback"
  ON public.professor_feedback FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Submission goes through a SECURITY DEFINER function only; block direct inserts.
CREATE POLICY "Block direct inserts"
  ON public.professor_feedback FOR INSERT TO authenticated
  WITH CHECK (false);

-- Submit feedback (anonymous; one per student/course/semester)
CREATE OR REPLACE FUNCTION public.submit_professor_feedback(
  _course_id uuid,
  _semester_id uuid,
  _rating smallint,
  _comment text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_professor uuid;
  v_hash text;
  v_open boolean;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;
  IF _rating < 1 OR _rating > 5 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_rating');
  END IF;

  -- Must be enrolled in this course
  IF NOT EXISTS (
    SELECT 1 FROM enrollments WHERE user_id = v_user AND course_id = _course_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_enrolled');
  END IF;

  -- Campaign must be open
  SELECT (is_active AND now() BETWEEN opens_at AND closes_at) INTO v_open
    FROM feedback_campaigns WHERE semester_id = _semester_id;
  IF NOT COALESCE(v_open, false) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'campaign_closed');
  END IF;

  SELECT professor_id INTO v_professor FROM courses WHERE id = _course_id;
  IF v_professor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_professor');
  END IF;

  v_hash := encode(digest(v_user::text || ':' || _course_id::text || ':' || _semester_id::text, 'sha256'), 'hex');

  INSERT INTO professor_feedback (course_id, professor_id, semester_id, submitter_hash, rating, comment)
  VALUES (_course_id, v_professor, _semester_id, v_hash, _rating, NULLIF(trim(_comment), ''))
  ON CONFLICT (submitter_hash) DO NOTHING;

  RETURN jsonb_build_object('ok', true);
END; $$;

-- Need pgcrypto for digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Has the current student already submitted feedback for this course/semester?
CREATE OR REPLACE FUNCTION public.has_submitted_feedback(_course_id uuid, _semester_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_hash text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  v_hash := encode(digest(auth.uid()::text || ':' || _course_id::text || ':' || _semester_id::text, 'sha256'), 'hex');
  RETURN EXISTS (SELECT 1 FROM professor_feedback WHERE submitter_hash = v_hash);
END; $$;

-- Aggregate performance for a single professor (callable by that professor or admin)
CREATE OR REPLACE FUNCTION public.get_professor_performance(_professor_id uuid, _semester_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_feedback_avg numeric;
  v_feedback_count int;
  v_feedback_score numeric;
  v_attendance_score numeric;
  v_grading_score numeric;
  v_recorded int;
  v_expected int;
  v_avg_delay numeric;
  v_perf numeric;
  v_comments jsonb;
BEGIN
  IF v_caller IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
  IF v_caller <> _professor_id AND NOT has_role(v_caller, 'admin'::app_role) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  -- Feedback (anonymous aggregate)
  SELECT AVG(rating)::numeric, COUNT(*)::int
    INTO v_feedback_avg, v_feedback_count
    FROM professor_feedback
    WHERE professor_id = _professor_id
      AND (_semester_id IS NULL OR semester_id = _semester_id);

  v_feedback_score := CASE WHEN v_feedback_avg IS NULL THEN NULL
                           ELSE ROUND(((v_feedback_avg - 1) / 4.0) * 100, 1) END;

  -- Attendance consistency: recorded sessions vs expected (weeks in semester)
  WITH prof_courses AS (
    SELECT id FROM courses WHERE professor_id = _professor_id
  ),
  recorded AS (
    SELECT COUNT(*)::int AS n FROM attendance_sessions
      WHERE course_id IN (SELECT id FROM prof_courses)
  ),
  expected AS (
    SELECT (COUNT(*) FILTER (WHERE c.id IS NOT NULL) * 14)::int AS n
      FROM prof_courses c
  )
  SELECT recorded.n, expected.n INTO v_recorded, v_expected FROM recorded, expected;

  v_attendance_score := CASE
    WHEN COALESCE(v_expected, 0) = 0 THEN NULL
    ELSE LEAST(100, ROUND((v_recorded::numeric / v_expected) * 100, 1))
  END;

  -- Grading timeliness: avg days from exam_date to grade insertion, for this prof's final exams.
  -- Score: 100 if avg <=7 days, linear down to 0 at 30 days.
  WITH prof_exams AS (
    SELECT es.course_id, es.exam_date
      FROM exam_schedule es
      JOIN courses c ON c.id = es.course_id
      WHERE c.professor_id = _professor_id AND es.exam_type = 'final'
  ),
  delays AS (
    SELECT EXTRACT(EPOCH FROM (g.created_at - pe.exam_date::timestamptz)) / 86400.0 AS days
      FROM prof_exams pe
      JOIN enrollments e ON e.course_id = pe.course_id
      JOIN grades g ON g.enrollment_id = e.id
      WHERE g.created_at >= pe.exam_date::timestamptz
  )
  SELECT AVG(days) INTO v_avg_delay FROM delays;

  v_grading_score := CASE
    WHEN v_avg_delay IS NULL THEN NULL
    WHEN v_avg_delay <= 7 THEN 100
    WHEN v_avg_delay >= 30 THEN 0
    ELSE ROUND(100 - ((v_avg_delay - 7) / 23.0) * 100, 1)
  END;

  v_perf := 0.5 * COALESCE(v_feedback_score, 0)
          + 0.25 * COALESCE(v_attendance_score, 0)
          + 0.25 * COALESCE(v_grading_score, 0);

  -- Anonymous comments (no submitter info)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('rating', rating, 'comment', comment, 'created_at', created_at) ORDER BY created_at DESC), '[]'::jsonb)
    INTO v_comments
    FROM professor_feedback
    WHERE professor_id = _professor_id
      AND comment IS NOT NULL
      AND (_semester_id IS NULL OR semester_id = _semester_id);

  RETURN jsonb_build_object(
    'ok', true,
    'professor_id', _professor_id,
    'feedback_score', v_feedback_score,
    'feedback_count', v_feedback_count,
    'feedback_avg', ROUND(COALESCE(v_feedback_avg, 0), 2),
    'attendance_score', v_attendance_score,
    'attendance_recorded', v_recorded,
    'attendance_expected', v_expected,
    'grading_score', v_grading_score,
    'avg_grading_delay_days', ROUND(COALESCE(v_avg_delay, 0), 2),
    'performance_score', ROUND(v_perf, 1),
    'comments', v_comments
  );
END; $$;

-- Admin-only: list performance for all professors
CREATE OR REPLACE FUNCTION public.get_all_professors_performance(_semester_id uuid DEFAULT NULL)
RETURNS TABLE (
  professor_id uuid,
  full_name text,
  department text,
  feedback_score numeric,
  feedback_count int,
  attendance_score numeric,
  grading_score numeric,
  performance_score numeric
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH profs AS (
    SELECT DISTINCT ur.user_id AS pid
    FROM user_roles ur WHERE ur.role = 'professor'
  ),
  fb AS (
    SELECT pf.professor_id, AVG(pf.rating)::numeric AS avg_r, COUNT(*)::int AS cnt
      FROM professor_feedback pf
      WHERE (_semester_id IS NULL OR pf.semester_id = _semester_id)
      GROUP BY pf.professor_id
  ),
  att AS (
    SELECT c.professor_id,
           COUNT(s.id)::int AS recorded,
           (COUNT(DISTINCT c.id) * 14)::int AS expected
      FROM courses c
      LEFT JOIN attendance_sessions s ON s.course_id = c.id
      WHERE c.professor_id IS NOT NULL
      GROUP BY c.professor_id
  ),
  gr AS (
    SELECT c.professor_id,
           AVG(EXTRACT(EPOCH FROM (g.created_at - es.exam_date::timestamptz)) / 86400.0) AS avg_delay
      FROM courses c
      JOIN exam_schedule es ON es.course_id = c.id AND es.exam_type = 'final'
      JOIN enrollments e ON e.course_id = c.id
      JOIN grades g ON g.enrollment_id = e.id
      WHERE g.created_at >= es.exam_date::timestamptz
      GROUP BY c.professor_id
  )
  SELECT p.pid,
         COALESCE(pr.full_name, '') AS full_name,
         COALESCE(pr.program, '') AS department,
         CASE WHEN fb.avg_r IS NULL THEN NULL ELSE ROUND(((fb.avg_r - 1)/4.0)*100, 1) END AS feedback_score,
         COALESCE(fb.cnt, 0) AS feedback_count,
         CASE WHEN att.expected IS NULL OR att.expected = 0 THEN NULL
              ELSE LEAST(100, ROUND((att.recorded::numeric / att.expected)*100, 1)) END AS attendance_score,
         CASE WHEN gr.avg_delay IS NULL THEN NULL
              WHEN gr.avg_delay <= 7 THEN 100
              WHEN gr.avg_delay >= 30 THEN 0
              ELSE ROUND(100 - ((gr.avg_delay - 7) / 23.0) * 100, 1) END AS grading_score,
         ROUND(
           0.5 * COALESCE(CASE WHEN fb.avg_r IS NULL THEN NULL ELSE ((fb.avg_r - 1)/4.0)*100 END, 0)
         + 0.25 * COALESCE(CASE WHEN att.expected IS NULL OR att.expected = 0 THEN NULL ELSE LEAST(100, (att.recorded::numeric / att.expected)*100) END, 0)
         + 0.25 * COALESCE(CASE WHEN gr.avg_delay IS NULL THEN NULL
                                WHEN gr.avg_delay <= 7 THEN 100
                                WHEN gr.avg_delay >= 30 THEN 0
                                ELSE 100 - ((gr.avg_delay - 7) / 23.0) * 100 END, 0), 1) AS performance_score
  FROM profs p
  LEFT JOIN profiles pr ON pr.user_id = p.pid
  LEFT JOIN fb ON fb.professor_id = p.pid
  LEFT JOIN att ON att.professor_id = p.pid
  LEFT JOIN gr ON gr.professor_id = p.pid
  ORDER BY performance_score DESC NULLS LAST;
END; $$;