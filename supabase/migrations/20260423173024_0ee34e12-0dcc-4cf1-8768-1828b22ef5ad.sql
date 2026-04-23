ALTER TABLE public.exam_schedule
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS supervisor_name text NOT NULL DEFAULT '';

-- Replace overly-permissive student SELECT with published-only access
DROP POLICY IF EXISTS "Anyone authenticated can view exam schedule" ON public.exam_schedule;

CREATE POLICY "Admins can view all exam schedule"
  ON public.exam_schedule FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Professors can view all exam schedule"
  ON public.exam_schedule FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'professor'::app_role));

CREATE POLICY "Students can view published exam schedule"
  ON public.exam_schedule FOR SELECT TO authenticated
  USING (is_published = true);