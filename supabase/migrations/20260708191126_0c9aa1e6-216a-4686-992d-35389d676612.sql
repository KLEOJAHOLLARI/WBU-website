
-- 1. Table
CREATE TABLE public.resit_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  semester_id UUID REFERENCES public.academic_semesters(id) ON DELETE SET NULL,
  original_grade SMALLINT NOT NULL CHECK (original_grade BETWEEN 4 AND 10),
  resit_grade SMALLINT CHECK (resit_grade BETWEEN 4 AND 8),
  final_grade SMALLINT CHECK (final_grade BETWEEN 4 AND 10),
  exam_date DATE,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','graded','cancelled')),
  graded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resit_exams TO authenticated;
GRANT ALL ON public.resit_exams TO service_role;

ALTER TABLE public.resit_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own resits"
ON public.resit_exams FOR SELECT TO authenticated
USING (auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = resit_exams.course_id AND c.professor_id = auth.uid()));

CREATE POLICY "Admins manage resits"
ON public.resit_exams FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Professors update their course resits"
ON public.resit_exams FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = resit_exams.course_id AND c.professor_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = resit_exams.course_id AND c.professor_id = auth.uid()));

CREATE TRIGGER trg_resit_exams_updated_at
BEFORE UPDATE ON public.resit_exams
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_resit_exams_course ON public.resit_exams(course_id);
CREATE INDEX idx_resit_exams_user ON public.resit_exams(user_id);

-- 2. Helper: compute an enrollment's completed Albanian final grade (or NULL if not fully graded)
CREATE OR REPLACE FUNCTION public.compute_enrollment_final_albanian(_enrollment_id uuid)
RETURNS smallint
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_course_id uuid;
  v_pct numeric;
  v_total int;
  v_graded int;
BEGIN
  SELECT course_id INTO v_course_id FROM public.enrollments WHERE id = _enrollment_id;
  IF v_course_id IS NULL THEN RETURN NULL; END IF;

  WITH comps AS (
    SELECT gc.id, gc.weight,
      (SELECT AVG((g.score/NULLIF(g.max_score,0))*100)
         FROM public.grades g
         WHERE g.enrollment_id = _enrollment_id AND g.grade_component_id = gc.id AND g.score IS NOT NULL) AS pct
    FROM public.grade_components gc WHERE gc.course_id = v_course_id
  )
  SELECT COUNT(*), COUNT(pct),
    CASE WHEN SUM(CASE WHEN pct IS NOT NULL THEN weight ELSE 0 END) > 0
      THEN SUM(CASE WHEN pct IS NOT NULL THEN pct*weight ELSE 0 END)/SUM(CASE WHEN pct IS NOT NULL THEN weight ELSE 0 END)
      ELSE NULL END
    INTO v_total, v_graded, v_pct FROM comps;

  IF v_total = 0 OR v_graded < v_total OR v_pct IS NULL THEN RETURN NULL; END IF;

  RETURN CASE
    WHEN v_pct >= 90 THEN 10 WHEN v_pct >= 85 THEN 9 WHEN v_pct >= 75 THEN 8
    WHEN v_pct >= 65 THEN 7 WHEN v_pct >= 55 THEN 6 WHEN v_pct >= 45 THEN 5 ELSE 4 END;
END; $$;

-- 3. Student view: eligible + registered
CREATE OR REPLACE FUNCTION public.get_my_resit_view()
RETURNS TABLE (
  enrollment_id uuid, course_id uuid, course_name text, course_code text,
  original_grade smallint, resit_id uuid, resit_grade smallint, final_grade smallint,
  status text, exam_date date
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT e.id, c.id, c.name, c.code,
    public.compute_enrollment_final_albanian(e.id) AS orig,
    r.id, r.resit_grade, r.final_grade,
    COALESCE(r.status, 'available'),
    r.exam_date
  FROM public.enrollments e
  JOIN public.courses c ON c.id = e.course_id
  LEFT JOIN public.resit_exams r ON r.enrollment_id = e.id
  WHERE e.user_id = auth.uid()
    AND (r.id IS NOT NULL OR public.compute_enrollment_final_albanian(e.id) BETWEEN 4 AND 7);
END; $$;

-- 4. Register
CREATE OR REPLACE FUNCTION public.register_for_resit(_enrollment_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid; v_course uuid; v_orig smallint; v_sem uuid;
BEGIN
  SELECT user_id, course_id INTO v_user, v_course FROM public.enrollments WHERE id = _enrollment_id;
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF v_user <> auth.uid() THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;
  IF EXISTS (SELECT 1 FROM public.resit_exams WHERE enrollment_id = _enrollment_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_registered');
  END IF;
  v_orig := public.compute_enrollment_final_albanian(_enrollment_id);
  IF v_orig IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_final_grade'); END IF;
  IF v_orig < 4 OR v_orig > 7 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_eligible', 'grade', v_orig);
  END IF;
  SELECT year_semester_id INTO v_sem FROM (SELECT NULL::uuid AS year_semester_id) s;
  INSERT INTO public.resit_exams (user_id, enrollment_id, course_id, original_grade)
    VALUES (auth.uid(), _enrollment_id, v_course, v_orig);
  RETURN jsonb_build_object('ok', true);
END; $$;

-- 5. Professor list of resit registrants for a course
CREATE OR REPLACE FUNCTION public.list_course_resits(_course_id uuid)
RETURNS TABLE (
  resit_id uuid, user_id uuid, full_name text, student_id text,
  original_grade smallint, resit_grade smallint, final_grade smallint,
  status text, exam_date date
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR
          EXISTS (SELECT 1 FROM public.courses WHERE id = _course_id AND professor_id = auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT r.id, r.user_id, p.full_name, p.student_id,
         r.original_grade, r.resit_grade, r.final_grade, r.status, r.exam_date
  FROM public.resit_exams r
  JOIN public.profiles p ON p.user_id = r.user_id
  WHERE r.course_id = _course_id
  ORDER BY p.full_name;
END; $$;

-- 6. Submit resit grade (professor / admin). Cap at 8, keep higher.
CREATE OR REPLACE FUNCTION public.submit_resit_grade(_resit_id uuid, _grade int, _exam_date date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_course uuid; v_orig smallint; v_capped smallint; v_final smallint; v_capped_warn boolean := false;
BEGIN
  SELECT course_id, original_grade INTO v_course, v_orig FROM public.resit_exams WHERE id = _resit_id;
  IF v_course IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR
          EXISTS (SELECT 1 FROM public.courses WHERE id = v_course AND professor_id = auth.uid())) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;
  IF _grade IS NULL OR _grade < 4 OR _grade > 10 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_grade');
  END IF;
  IF _grade > 8 THEN v_capped := 8; v_capped_warn := true; ELSE v_capped := _grade; END IF;
  v_final := GREATEST(v_orig, v_capped);
  UPDATE public.resit_exams
    SET resit_grade = v_capped, final_grade = v_final, status = 'graded',
        graded_by = auth.uid(), graded_at = now(),
        exam_date = COALESCE(_exam_date, exam_date)
    WHERE id = _resit_id;
  RETURN jsonb_build_object('ok', true, 'capped', v_capped_warn, 'final_grade', v_final);
END; $$;

-- 7. Transcript override: per-course adjusted Albanian final grade
CREATE OR REPLACE FUNCTION public.get_user_resit_overrides(_user_id uuid)
RETURNS TABLE (enrollment_id uuid, course_id uuid, final_grade smallint, original_grade smallint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT enrollment_id, course_id, final_grade, original_grade
  FROM public.resit_exams
  WHERE user_id = _user_id AND status = 'graded' AND final_grade IS NOT NULL;
$$;
