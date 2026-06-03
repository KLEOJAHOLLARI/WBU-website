
-- Assignments
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  attachment_path text,
  due_at timestamptz NOT NULL,
  max_points numeric NOT NULL DEFAULT 100,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage assignments" ON public.assignments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Professors manage own course assignments" ON public.assignments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = assignments.course_id AND c.professor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM courses c WHERE c.id = assignments.course_id AND c.professor_id = auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Students view assignments for enrolled courses" ON public.assignments
  FOR SELECT TO authenticated
  USING (is_published = true AND EXISTS (
    SELECT 1 FROM enrollments e WHERE e.course_id = assignments.course_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Professors view all course assignments" ON public.assignments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = assignments.course_id AND c.professor_id = auth.uid()));

-- Submissions
CREATE TABLE public.assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  content_type text NOT NULL DEFAULT 'application/octet-stream',
  note text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'submitted',
  score numeric,
  feedback text,
  graded_by uuid,
  graded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignment_submissions TO authenticated;
GRANT ALL ON public.assignment_submissions TO service_role;

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage submissions" ON public.assignment_submissions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students view own submissions" ON public.assignment_submissions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Students insert own submissions" ON public.assignment_submissions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.assignments a
    JOIN enrollments e ON e.course_id = a.course_id
    WHERE a.id = assignment_submissions.assignment_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Students update own ungraded submissions" ON public.assignment_submissions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND graded_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Professors view course submissions" ON public.assignment_submissions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assignments a JOIN courses c ON c.id = a.course_id
    WHERE a.id = assignment_submissions.assignment_id AND c.professor_id = auth.uid()
  ));

CREATE POLICY "Professors grade course submissions" ON public.assignment_submissions
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assignments a JOIN courses c ON c.id = a.course_id
    WHERE a.id = assignment_submissions.assignment_id AND c.professor_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.assignments a JOIN courses c ON c.id = a.course_id
    WHERE a.id = assignment_submissions.assignment_id AND c.professor_id = auth.uid()
  ));

CREATE INDEX idx_assignments_course ON public.assignments(course_id);
CREATE INDEX idx_submissions_assignment ON public.assignment_submissions(assignment_id);
CREATE INDEX idx_submissions_user ON public.assignment_submissions(user_id);

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON public.assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
