CREATE OR REPLACE FUNCTION public.submit_professor_feedback(_course_id uuid, _semester_id uuid, _rating smallint, _comment text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_professor uuid;
  v_hash text;
  v_feedback_enabled boolean;
  v_semester_number integer;
  v_student_program text;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  IF _rating < 1 OR _rating > 5 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_rating');
  END IF;

  SELECT feedback_enabled, semester
    INTO v_feedback_enabled, v_semester_number
    FROM public.academic_semesters
    WHERE id = _semester_id;

  IF NOT COALESCE(v_feedback_enabled, false) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'feedback_closed');
  END IF;

  SELECT program INTO v_student_program FROM public.profiles WHERE user_id = v_user;

  IF v_student_program IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_program');
  END IF;

  SELECT professor_id INTO v_professor
    FROM public.courses
    WHERE id = _course_id
      AND semester = v_semester_number
      AND (
        program = v_student_program
        OR EXISTS (
          SELECT 1 FROM public.course_shared_programs csp
          WHERE csp.course_id = _course_id AND csp.program_slug = v_student_program
        )
      );

  IF v_professor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'course_not_available');
  END IF;

  v_hash := encode(extensions.digest(convert_to(v_user::text || ':' || _course_id::text || ':' || _semester_id::text, 'UTF8'), 'sha256'), 'hex');

  INSERT INTO public.professor_feedback (course_id, professor_id, semester_id, submitter_hash, rating, comment)
  VALUES (_course_id, v_professor, _semester_id, v_hash, _rating, NULLIF(trim(_comment), ''))
  ON CONFLICT (submitter_hash) DO NOTHING;

  RETURN jsonb_build_object('ok', true);
END;
$function$;