-- Drop the problematic policy that references auth.users
DROP POLICY IF EXISTS "Students can view applications by email" ON public.applications;

-- Recreate using auth.jwt() to get email without querying auth.users
CREATE POLICY "Students can view applications by email"
ON public.applications
FOR SELECT
TO authenticated
USING (
  email = (auth.jwt() ->> 'email')
);