
-- Add new personal info columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS birthplace text,
  ADD COLUMN IF NOT EXISTS personal_id text,
  ADD COLUMN IF NOT EXISTS student_exam_code text,
  ADD COLUMN IF NOT EXISTS student_id text;

-- Add unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS profiles_personal_id_unique ON public.profiles (personal_id) WHERE personal_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_student_exam_code_unique ON public.profiles (student_exam_code) WHERE student_exam_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_student_id_unique ON public.profiles (student_id) WHERE student_id IS NOT NULL;
