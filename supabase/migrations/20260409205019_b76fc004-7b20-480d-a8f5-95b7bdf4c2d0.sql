DROP POLICY IF EXISTS "Authenticated can view professor profiles" ON public.profiles;

CREATE POLICY "Authenticated can view professor profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(profiles.user_id, 'professor'::public.app_role));