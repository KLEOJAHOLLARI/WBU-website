
-- Add professor role to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'professor';

-- Courses table
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program text NOT NULL,
  name text NOT NULL,
  code text NOT NULL DEFAULT '',
  professor_id uuid,
  year integer NOT NULL DEFAULT 1,
  semester integer NOT NULL DEFAULT 1,
  syllabus_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view courses" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update courses" ON public.courses FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete courses" ON public.courses FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Enrollments table
CREATE TABLE public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own enrollments" ON public.enrollments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all enrollments" ON public.enrollments FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Professors can view enrollments for their courses" ON public.enrollments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND professor_id = auth.uid())
);
CREATE POLICY "Admins can manage enrollments" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update enrollments" ON public.enrollments FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete enrollments" ON public.enrollments FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Grade components (evaluation scheme per course)
CREATE TABLE public.grade_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  weight numeric NOT NULL DEFAULT 0,
  count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.grade_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view grade components" ON public.grade_components FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage grade components" ON public.grade_components FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Professors can manage own course grade components" ON public.grade_components FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND professor_id = auth.uid())
);
CREATE POLICY "Admins can update grade components" ON public.grade_components FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Professors can update own course grade components" ON public.grade_components FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND professor_id = auth.uid())
);
CREATE POLICY "Admins can delete grade components" ON public.grade_components FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Professors can delete own course grade components" ON public.grade_components FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND professor_id = auth.uid())
);

-- Grades table
CREATE TABLE public.grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  grade_component_id uuid NOT NULL REFERENCES public.grade_components(id) ON DELETE CASCADE,
  instance_number integer NOT NULL DEFAULT 1,
  score numeric,
  max_score numeric NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(enrollment_id, grade_component_id, instance_number)
);
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own grades" ON public.grades FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.enrollments WHERE id = enrollment_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can view all grades" ON public.grades FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Professors can view grades for their courses" ON public.grades FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.id = enrollment_id AND c.professor_id = auth.uid()
  )
);
CREATE POLICY "Professors can insert grades" ON public.grades FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.id = enrollment_id AND c.professor_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Professors can update grades" ON public.grades FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.id = enrollment_id AND c.professor_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Admins can delete grades" ON public.grades FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Attendance sessions
CREATE TABLE public.attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  week_number integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view attendance sessions" ON public.attendance_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Professors can manage attendance sessions" ON public.attendance_sessions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND professor_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Professors can update attendance sessions" ON public.attendance_sessions FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND professor_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Professors can delete attendance sessions" ON public.attendance_sessions FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND professor_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
);

-- Attendance records
CREATE TABLE public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'absent',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, enrollment_id)
);
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own attendance" ON public.attendance_records FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.enrollments WHERE id = enrollment_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can view all attendance" ON public.attendance_records FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Professors can view attendance for their courses" ON public.attendance_records FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.id = enrollment_id AND c.professor_id = auth.uid()
  )
);
CREATE POLICY "Professors can manage attendance records" ON public.attendance_records FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.id = enrollment_id AND c.professor_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Professors can update attendance records" ON public.attendance_records FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.id = enrollment_id AND c.professor_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix: Allow students to view their own applications
CREATE POLICY "Students can view own applications" ON public.applications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Students can view applications by email" ON public.applications FOR SELECT TO authenticated USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
