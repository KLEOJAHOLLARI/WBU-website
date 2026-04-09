
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  program text,
  author_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view announcements"
ON public.announcements FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can insert announcements"
ON public.announcements FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Professors can insert announcements for their courses"
ON public.announcements FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = author_id
  AND has_role(auth.uid(), 'professor')
  AND (course_id IS NULL OR EXISTS (
    SELECT 1 FROM courses WHERE courses.id = announcements.course_id AND courses.professor_id = auth.uid()
  ))
);

CREATE POLICY "Admins can update announcements"
ON public.announcements FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Professors can update own announcements"
ON public.announcements FOR UPDATE TO authenticated
USING (auth.uid() = author_id AND has_role(auth.uid(), 'professor'));

CREATE POLICY "Admins can delete announcements"
ON public.announcements FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Professors can delete own announcements"
ON public.announcements FOR DELETE TO authenticated
USING (auth.uid() = author_id AND has_role(auth.uid(), 'professor'));

CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
