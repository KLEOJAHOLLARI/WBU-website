CREATE OR REPLACE FUNCTION public.preview_deans_list(
  _semester_id uuid,
  _program text DEFAULT NULL,
  _threshold numeric DEFAULT NULL,
  _min_courses integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_threshold numeric;
  v_min_courses integer;
  v_settings jsonb;
  v_sem record;
  v_rows jsonb;
BEGIN
  IF NOT has_role(v_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT value INTO v_settings FROM system_settings WHERE key = 'deans_list';
  v_threshold := COALESCE(_threshold, (v_settings->>'threshold_gpa')::numeric, 9.0);
  v_min_courses := COALESCE(_min_courses, (v_settings->>'min_courses')::integer, 3);

  SELECT year, semester INTO v_sem FROM academic_semesters WHERE id = _semester_id;
  IF v_sem.year IS NULL THEN RAISE EXCEPTION 'invalid_semester'; END IF;

  WITH target_courses AS (
    SELECT c.id, c.program FROM courses c
    WHERE c.year = v_sem.year AND c.semester = v_sem.semester
      AND (_program IS NULL OR c.program = _program)
  ),
  per_enr AS (
    SELECT e.user_id, e.id AS enrollment_id, e.course_id, tc.program,
      SUM(CASE WHEN comp_avg.avg_pct IS NOT NULL THEN comp_avg.avg_pct * gc.weight ELSE 0 END)
        / NULLIF(SUM(CASE WHEN comp_avg.avg_pct IS NOT NULL THEN gc.weight ELSE 0 END), 0) AS pct,
      COUNT(gc.id) AS total_components,
      COUNT(comp_avg.avg_pct) AS graded_components
    FROM enrollments e
    JOIN target_courses tc ON tc.id = e.course_id
    LEFT JOIN grade_components gc ON gc.course_id = e.course_id
    LEFT JOIN LATERAL (
      SELECT AVG((g.score / NULLIF(g.max_score,0)) * 100) AS avg_pct
      FROM grades g
      WHERE g.enrollment_id = e.id AND g.grade_component_id = gc.id AND g.score IS NOT NULL
    ) comp_avg ON true
    GROUP BY e.user_id, e.id, e.course_id, tc.program
  ),
  completed AS (
    SELECT * FROM per_enr WHERE total_components > 0 AND graded_components = total_components AND pct IS NOT NULL
  ),
  per_student AS (
    SELECT user_id, MAX(program) AS program, COUNT(*) AS course_count,
      AVG(CASE WHEN pct>=90 THEN 10 WHEN pct>=85 THEN 9 WHEN pct>=75 THEN 8 WHEN pct>=65 THEN 7 WHEN pct>=55 THEN 6 WHEN pct>=45 THEN 5 ELSE 4 END)::numeric AS gpa_alb,
      AVG(CASE WHEN pct>=90 THEN 4.0 WHEN pct>=85 THEN 3.5 WHEN pct>=75 THEN 3.0 WHEN pct>=65 THEN 2.5 WHEN pct>=55 THEN 2.0 WHEN pct>=45 THEN 1.0 ELSE 0.0 END)::numeric AS gpa_4
    FROM completed GROUP BY user_id
  ),
  ranked AS (
    SELECT ps.*, p.full_name, p.program AS profile_program,
      ROW_NUMBER() OVER (ORDER BY ps.gpa_alb DESC, ps.course_count DESC) AS rnk
    FROM per_student ps
    JOIN profiles p ON p.user_id = ps.user_id
    WHERE ps.gpa_alb >= v_threshold AND ps.course_count >= v_min_courses
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'rank', rnk,
    'user_id', user_id,
    'full_name', COALESCE(full_name,''),
    'program', COALESCE(program, profile_program, ''),
    'gpa_albanian', ROUND(gpa_alb,2),
    'gpa_4', ROUND(gpa_4,2),
    'course_count', course_count
  ) ORDER BY rnk), '[]'::jsonb) INTO v_rows FROM ranked;

  RETURN jsonb_build_object('ok', true, 'threshold', v_threshold, 'min_courses', v_min_courses, 'count', jsonb_array_length(v_rows), 'rows', v_rows);
END;
$function$;