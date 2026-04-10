
-- Junction table: which programs can see a shared course
CREATE TABLE public.course_shared_programs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  program_slug text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(course_id, program_slug)
);

ALTER TABLE public.course_shared_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view" ON public.course_shared_programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert" ON public.course_shared_programs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update" ON public.course_shared_programs FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete" ON public.course_shared_programs FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
