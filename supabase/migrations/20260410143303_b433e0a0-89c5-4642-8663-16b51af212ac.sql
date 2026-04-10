
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS birthplace text,
  ADD COLUMN IF NOT EXISTS personal_id text;

CREATE UNIQUE INDEX IF NOT EXISTS applications_personal_id_unique 
ON public.applications (personal_id) WHERE personal_id IS NOT NULL;
