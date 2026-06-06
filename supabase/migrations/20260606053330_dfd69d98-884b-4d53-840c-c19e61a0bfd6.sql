
-- Seating charts per course (one chart per course)
CREATE TABLE public.seating_charts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL UNIQUE,
  rows int NOT NULL DEFAULT 5,
  cols int NOT NULL DEFAULT 6,
  label text NOT NULL DEFAULT 'Classroom',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seating_charts TO authenticated;
GRANT ALL ON public.seating_charts TO service_role;

ALTER TABLE public.seating_charts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage seating charts" ON public.seating_charts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Professors manage own course seating" ON public.seating_charts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = seating_charts.course_id AND c.professor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM courses c WHERE c.id = seating_charts.course_id AND c.professor_id = auth.uid()));

CREATE POLICY "Students view enrolled course seating" ON public.seating_charts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = seating_charts.course_id AND e.user_id = auth.uid()));

-- Seat assignments
CREATE TABLE public.seat_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id uuid NOT NULL REFERENCES public.seating_charts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  row_index int NOT NULL,
  col_index int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chart_id, row_index, col_index),
  UNIQUE (chart_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seat_assignments TO authenticated;
GRANT ALL ON public.seat_assignments TO service_role;

ALTER TABLE public.seat_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage seat assignments" ON public.seat_assignments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Professors manage own course seat assignments" ON public.seat_assignments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM seating_charts sc JOIN courses c ON c.id = sc.course_id WHERE sc.id = seat_assignments.chart_id AND c.professor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM seating_charts sc JOIN courses c ON c.id = sc.course_id WHERE sc.id = seat_assignments.chart_id AND c.professor_id = auth.uid()));

CREATE POLICY "Students view seat assignments for enrolled course" ON public.seat_assignments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM seating_charts sc JOIN enrollments e ON e.course_id = sc.course_id WHERE sc.id = seat_assignments.chart_id AND e.user_id = auth.uid()));

CREATE TRIGGER update_seating_charts_updated_at
  BEFORE UPDATE ON public.seating_charts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
