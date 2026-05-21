CREATE POLICY "Public can read hero_media and homepage_announcement"
ON public.system_settings
FOR SELECT
TO anon, authenticated
USING (key IN ('hero_media', 'homepage_announcement'));