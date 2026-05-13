CREATE OR REPLACE FUNCTION public.generate_deans_list(
  _semester_id uuid,
  _program text DEFAULT NULL,
  _threshold numeric DEFAULT NULL,
  _min_courses integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_threshold numeric;
  v_min_courses integer;
  v_settings jsonb;
  v_snapshot_id uuid;
  v_sem record;
  v_count integer;
BEGIN
  IF NOT has_role(v_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT value INTO v_settings FROM system_settings WHERE key = 'deans_list';
  v_threshold := COALESCE(_threshold, (v_settings->>'threshold_gpa')::numeric, 9.0);
  v_min_courses := COALESCE(_min_courses, (v_settings->>'min_courses')::integer, 3);

  SELECT year, semester INTO v_sem FROM academic_semesters WHERE id = _semester_id;
  IF v_sem.year IS NULL THEN RAISE EXCEPTION 'invalid_semester'; END IF;

  SELECT id INTO v_snapshot_id
  FROM deans_list_snapshots
  WHERE semester_id = _semester_id
    AND program IS NOT DISTINCT FROM _program
  ORDER BY generated_at DESC
  LIMIT 1;

  IF v_snapshot_id IS NULL THEN
    INSERT INTO deans_list_snapshots (semester_id, program, threshold_gpa, generated_by)
    VALUES (_semester_id, _program, v_threshold, v_caller)
    RETURNING id INTO v_snapshot_id;
  ELSE
    UPDATE deans_list_snapshots
    SET threshold_gpa = v_threshold,
        generated_at = now(),
        generated_by = v_caller,
        is_published = false,
        published_at = NULL
    WHERE id = v_snapshot_id;
  END IF;

  UPDATE deans_list_snapshots
  SET is_published = false,
      published_at = NULL
  WHERE semester_id = _semester_id
    AND program IS NOT DISTINCT FROM _program
    AND id <> v_snapshot_id;

  DELETE FROM deans_list_entries WHERE snapshot_id = v_snapshot_id;

  WITH target_courses AS (
    SELECT c.id, c.program
    FROM courses c
    WHERE c.year = v_sem.year AND c.semester = v_sem.semester
      AND (_program IS NULL OR c.program = _program)
  ),
  per_enr AS (
    SELECT
      e.user_id,
      e.id AS enrollment_id,
      e.course_id,
      tc.program,
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
    SELECT * FROM per_enr
    WHERE total_components > 0 AND graded_components = total_components AND pct IS NOT NULL
  ),
  per_student AS (
    SELECT
      user_id,
      MAX(program) AS program,
      COUNT(*) AS course_count,
      AVG(
        CASE
          WHEN pct >= 90 THEN 10
          WHEN pct >= 85 THEN 9
          WHEN pct >= 75 THEN 8
          WHEN pct >= 65 THEN 7
          WHEN pct >= 55 THEN 6
          WHEN pct >= 45 THEN 5
          ELSE 4
        END
      )::numeric AS gpa_alb,
      AVG(
        CASE
          WHEN pct >= 90 THEN 4.0
          WHEN pct >= 85 THEN 3.5
          WHEN pct >= 75 THEN 3.0
          WHEN pct >= 65 THEN 2.5
          WHEN pct >= 55 THEN 2.0
          WHEN pct >= 45 THEN 1.0
          ELSE 0.0
        END
      )::numeric AS gpa_4
    FROM completed
    GROUP BY user_id
  ),
  ranked AS (
    SELECT ps.*, p.full_name, p.program AS profile_program,
      ROW_NUMBER() OVER (ORDER BY ps.gpa_alb DESC, ps.course_count DESC, p.full_name ASC) AS rnk
    FROM per_student ps
    JOIN profiles p ON p.user_id = ps.user_id
    WHERE ps.gpa_alb >= v_threshold AND ps.course_count >= v_min_courses
  )
  INSERT INTO deans_list_entries (snapshot_id, user_id, rank, gpa_albanian, gpa_4, full_name, program)
  SELECT v_snapshot_id, user_id, rnk::int, ROUND(gpa_alb,2), ROUND(gpa_4,2),
         COALESCE(full_name,''), COALESCE(program, profile_program, '')
  FROM ranked
  ON CONFLICT (snapshot_id, user_id) DO UPDATE
  SET rank = EXCLUDED.rank,
      gpa_albanian = EXCLUDED.gpa_albanian,
      gpa_4 = EXCLUDED.gpa_4,
      full_name = EXCLUDED.full_name,
      program = EXCLUDED.program;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'snapshot_id', v_snapshot_id, 'count', v_count, 'threshold', v_threshold);
END;
$$;

UPDATE public.deans_list_snapshots old
SET is_published = false,
    published_at = NULL
WHERE is_published = true
  AND EXISTS (
    SELECT 1
    FROM public.deans_list_snapshots newer
    WHERE newer.is_published = true
      AND newer.semester_id = old.semester_id
      AND newer.program IS NOT DISTINCT FROM old.program
      AND newer.generated_at > old.generated_at
  );