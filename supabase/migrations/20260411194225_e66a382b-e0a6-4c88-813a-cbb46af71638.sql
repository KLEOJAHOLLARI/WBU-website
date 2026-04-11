
-- Grade notifications table
CREATE TABLE public.grade_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  grade_id uuid,
  course_name text NOT NULL DEFAULT '',
  component_name text NOT NULL DEFAULT '',
  score numeric,
  max_score numeric NOT NULL DEFAULT 100,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.grade_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own grade notifications"
  ON public.grade_notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Students can mark notifications read"
  ON public.grade_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Professors can insert grade notifications"
  ON public.grade_notifications FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'professor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all grade notifications"
  ON public.grade_notifications FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Exam schedule table
CREATE TABLE public.exam_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  program text NOT NULL,
  exam_date date NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  room text NOT NULL DEFAULT '',
  exam_type text NOT NULL DEFAULT 'final',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view exam schedule"
  ON public.exam_schedule FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert exam schedule"
  ON public.exam_schedule FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update exam schedule"
  ON public.exam_schedule FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete exam schedule"
  ON public.exam_schedule FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_exam_schedule_updated_at
  BEFORE UPDATE ON public.exam_schedule
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Allow students to send messages (reply)
CREATE POLICY "Students can send reply messages"
  ON public.student_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND sent_by_admin = false);

-- Auto-create grade notification on grade insert/update
CREATE OR REPLACE FUNCTION public.notify_grade_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_course_name text;
  v_component_name text;
BEGIN
  -- Get user_id from enrollment
  SELECT e.user_id INTO v_user_id
  FROM enrollments e WHERE e.id = NEW.enrollment_id;

  -- Get course name
  SELECT c.name INTO v_course_name
  FROM courses c
  JOIN enrollments e ON e.course_id = c.id
  WHERE e.id = NEW.enrollment_id;

  -- Get component name
  SELECT gc.name INTO v_component_name
  FROM grade_components gc WHERE gc.id = NEW.grade_component_id;

  IF v_user_id IS NOT NULL AND NEW.score IS NOT NULL THEN
    INSERT INTO grade_notifications (user_id, grade_id, course_name, component_name, score, max_score)
    VALUES (v_user_id, NEW.id, COALESCE(v_course_name, ''), COALESCE(v_component_name, ''), NEW.score, NEW.max_score)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_grade_change
  AFTER INSERT OR UPDATE OF score ON public.grades
  FOR EACH ROW EXECUTE FUNCTION public.notify_grade_change();
