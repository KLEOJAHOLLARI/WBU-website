
-- Add year, semester, and status columns to academic_semesters
ALTER TABLE public.academic_semesters ADD COLUMN IF NOT EXISTS year integer NOT NULL DEFAULT 1;
ALTER TABLE public.academic_semesters ADD COLUMN IF NOT EXISTS semester integer NOT NULL DEFAULT 1;
ALTER TABLE public.academic_semesters ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Create trigger function to ensure only one semester is current
CREATE OR REPLACE FUNCTION public.ensure_single_current_semester()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE academic_semesters SET is_current = false WHERE id != NEW.id AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS enforce_single_current_semester ON public.academic_semesters;
CREATE TRIGGER enforce_single_current_semester
  BEFORE INSERT OR UPDATE ON public.academic_semesters
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_current_semester();
