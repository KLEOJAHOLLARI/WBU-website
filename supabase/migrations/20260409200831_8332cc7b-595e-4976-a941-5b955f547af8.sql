CREATE POLICY "Advisors can view requesting student profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM enrollment_requests er
    JOIN courses c ON c.id = er.course_id
    JOIN program_advisors pa ON pa.program = c.program
    WHERE er.user_id = profiles.user_id
    AND pa.advisor_id = auth.uid()
  )
);