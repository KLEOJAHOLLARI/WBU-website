
-- Snapshots: one per (semester, program) generation
CREATE TABLE public.deans_list_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_id uuid NOT NULL,
  program text, -- null = all programs
  threshold_gpa numeric NOT NULL DEFAULT 9.0, -- Albanian scale
  is_published boolean NOT NULL DEFAULT false,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid,
  published_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (semester_id, program)
);

CREATE TABLE public.deans_list_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES public.deans_list_snapshots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rank integer NOT NULL,
  gpa_albanian numeric NOT NULL,
  gpa_4 numeric NOT NULL,
  full_name text NOT NULL DEFAULT '',
  program text NOT NULL DEFAULT '',
  certificate_code text NOT NULL DEFAULT ('DL-' || upper(substring(md5(random()::text),1,8))),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (snapshot_id, user_id)
);

CREATE INDEX idx_dle_snapshot ON public.deans_list_entries(snapshot_id);
CREATE INDEX idx_dle_user ON public.deans_list_entries(user_id);

ALTER TABLE public.deans_list_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deans_list_entries ENABLE ROW LEVEL SECURITY;

-- Snapshots: admins manage; everyone can see published, students/profs see published.
CREATE POLICY "Admins manage deans snapshots" ON public.deans_list_snapshots
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Public view published snapshots" ON public.deans_list_snapshots
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

-- Entries: admins manage; public sees only entries of published snapshots.
CREATE POLICY "Admins manage deans entries" ON public.deans_list_entries
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Public view published entries" ON public.deans_list_entries
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.deans_list_snapshots s WHERE s.id = snapshot_id AND s.is_published = true));
CREATE POLICY "Students view own entries" ON public.deans_list_entries
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_dls_updated BEFORE UPDATE ON public.deans_list_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default settings
INSERT INTO public.system_settings (key, value)
VALUES ('deans_list', jsonb_build_object('threshold_gpa', 9.0, 'min_courses', 3))
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- Generate (or regenerate) a Dean's List snapshot
-- ============================================================================
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

  -- Upsert snapshot
  INSERT INTO deans_list_snapshots (semester_id, program, threshold_gpa, generated_by)
  VALUES (_semester_id, _program, v_threshold, v_caller)
  ON CONFLICT (semester_id, program) DO UPDATE
    SET threshold_gpa = v_threshold,
        generated_at = now(),
        generated_by = v_caller,
        is_published = false,
        published_at = NULL
  RETURNING id INTO v_snapshot_id;

  -- Wipe existing entries
  DELETE FROM deans_list_entries WHERE snapshot_id = v_snapshot_id;

  -- Compute per-student per-course weighted percent for matching semester courses,
  -- only courses that are fully graded (all components have a score), then average
  -- Albanian grade across those courses. Filter by program if provided.
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
      ROW_NUMBER() OVER (ORDER BY ps.gpa_alb DESC, ps.course_count DESC) AS rnk
    FROM per_student ps
    JOIN profiles p ON p.user_id = ps.user_id
    WHERE ps.gpa_alb >= v_threshold AND ps.course_count >= v_min_courses
  )
  INSERT INTO deans_list_entries (snapshot_id, user_id, rank, gpa_albanian, gpa_4, full_name, program)
  SELECT v_snapshot_id, user_id, rnk::int, ROUND(gpa_alb,2), ROUND(gpa_4,2),
         COALESCE(full_name,''), COALESCE(program, profile_program, '')
  FROM ranked;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'snapshot_id', v_snapshot_id, 'count', v_count, 'threshold', v_threshold);
END;
$$;

-- Get current user's own honor entries (with snapshot meta)
CREATE OR REPLACE FUNCTION public.get_my_honors()
RETURNS TABLE(
  entry_id uuid, snapshot_id uuid, semester_id uuid, semester_name text,
  program text, rank integer, gpa_albanian numeric, gpa_4 numeric,
  is_published boolean, certificate_code text, generated_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, s.id, s.semester_id, sem.name, e.program, e.rank, e.gpa_albanian, e.gpa_4,
         s.is_published, e.certificate_code, s.generated_at
  FROM deans_list_entries e
  JOIN deans_list_snapshots s ON s.id = e.snapshot_id
  LEFT JOIN academic_semesters sem ON sem.id = s.semester_id
  WHERE e.user_id = auth.uid()
  ORDER BY s.generated_at DESC;
$$;
