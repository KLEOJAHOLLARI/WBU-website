
-- Allow professors to insert messages to students in their courses
CREATE POLICY "Professors can send messages to enrolled students" ON public.student_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'professor') AND
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE e.user_id = student_messages.user_id
      AND c.professor_id = auth.uid()
    )
  );

-- Allow professors to view messages they sent
CREATE POLICY "Professors can view messages to their students" ON public.student_messages
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'professor') AND
    sent_by_admin = false AND
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE e.user_id = student_messages.user_id
      AND c.professor_id = auth.uid()
    )
  );
