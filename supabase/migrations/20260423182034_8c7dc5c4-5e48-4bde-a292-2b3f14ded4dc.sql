-- Allow professors to update their own courses (e.g. syllabus_url)
CREATE POLICY "Professors can update own courses"
ON public.courses
FOR UPDATE
TO authenticated
USING (professor_id = auth.uid())
WITH CHECK (professor_id = auth.uid());