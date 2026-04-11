
-- Quizzes table
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  time_limit_minutes INTEGER DEFAULT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Quiz questions
CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  options JSONB DEFAULT '[]'::jsonb,
  correct_answer TEXT NOT NULL DEFAULT '',
  points INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Quiz attempts by students
CREATE TABLE public.quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  score NUMERIC,
  max_score NUMERIC,
  answers JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Quizzes policies
CREATE POLICY "Professors can manage own course quizzes" ON public.quizzes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = quizzes.course_id AND courses.professor_id = auth.uid()) OR has_role(auth.uid(), 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM courses WHERE courses.id = quizzes.course_id AND courses.professor_id = auth.uid()) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Students can view published quizzes for enrolled courses" ON public.quizzes
  FOR SELECT TO authenticated
  USING (is_published = true AND EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = quizzes.course_id AND enrollments.user_id = auth.uid()));

-- Quiz questions policies
CREATE POLICY "Professors can manage quiz questions" ON public.quiz_questions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM quizzes q JOIN courses c ON c.id = q.course_id WHERE q.id = quiz_questions.quiz_id AND (c.professor_id = auth.uid() OR has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM quizzes q JOIN courses c ON c.id = q.course_id WHERE q.id = quiz_questions.quiz_id AND (c.professor_id = auth.uid() OR has_role(auth.uid(), 'admin'))));

CREATE POLICY "Students can view questions of published quizzes" ON public.quiz_questions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM quizzes q JOIN enrollments e ON e.course_id = q.course_id WHERE q.id = quiz_questions.quiz_id AND q.is_published = true AND e.user_id = auth.uid()));

-- Quiz attempts policies
CREATE POLICY "Students can create own attempts" ON public.quiz_attempts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can view own attempts" ON public.quiz_attempts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Students can update own attempts" ON public.quiz_attempts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Professors can view attempts for their courses" ON public.quiz_attempts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM quizzes q JOIN courses c ON c.id = q.course_id WHERE q.id = quiz_attempts.quiz_id AND c.professor_id = auth.uid()) OR has_role(auth.uid(), 'admin'));

-- Admins full access to attempts
CREATE POLICY "Admins can manage all attempts" ON public.quiz_attempts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
