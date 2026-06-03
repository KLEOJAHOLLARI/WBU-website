
-- Submissions bucket policies
CREATE POLICY "students upload own submissions"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'assignment-submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "students update own submission files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'assignment-submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "students read own submission files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'assignment-submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "professors read course submission files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'assignment-submissions' AND EXISTS (
    SELECT 1 FROM public.assignment_submissions s
    JOIN public.assignments a ON a.id = s.assignment_id
    JOIN public.courses c ON c.id = a.course_id
    WHERE s.file_path = storage.objects.name AND c.professor_id = auth.uid()
  )
);

CREATE POLICY "admins manage submission files"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'assignment-submissions' AND has_role(auth.uid(),'admin'::app_role))
WITH CHECK (bucket_id = 'assignment-submissions' AND has_role(auth.uid(),'admin'::app_role));
