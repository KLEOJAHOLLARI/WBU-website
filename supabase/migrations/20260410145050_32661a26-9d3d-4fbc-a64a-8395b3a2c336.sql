
-- Backfill student_id for existing approved profiles missing it
UPDATE public.profiles
SET student_id = public.generate_student_id()
WHERE account_status = 'approved'
  AND (student_id IS NULL OR student_id = '');

-- Backfill student_exam_code for existing approved profiles missing it
UPDATE public.profiles
SET student_exam_code = public.generate_exam_code()
WHERE account_status = 'approved'
  AND (student_exam_code IS NULL OR student_exam_code = '');
