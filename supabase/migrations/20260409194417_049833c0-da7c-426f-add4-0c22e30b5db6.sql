
-- Create course_materials table
CREATE TABLE public.course_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view materials
CREATE POLICY "Authenticated can view course materials"
ON public.course_materials FOR SELECT TO authenticated
USING (true);

-- Professors can insert materials for their courses
CREATE POLICY "Professors can insert materials for own courses"
ON public.course_materials FOR INSERT TO authenticated
WITH CHECK (
  (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_materials.course_id AND courses.professor_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Professors can delete materials for their courses
CREATE POLICY "Professors can delete materials for own courses"
ON public.course_materials FOR DELETE TO authenticated
USING (
  (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_materials.course_id AND courses.professor_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can do everything
CREATE POLICY "Admins can manage all materials"
ON public.course_materials FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('course-materials', 'course-materials', true);

-- Storage policies
CREATE POLICY "Anyone can view course materials files"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-materials');

CREATE POLICY "Professors can upload course materials"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'course-materials');

CREATE POLICY "Professors can delete course materials"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'course-materials');
