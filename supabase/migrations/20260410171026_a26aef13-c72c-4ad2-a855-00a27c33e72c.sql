
CREATE OR REPLACE FUNCTION public.auto_assign_student_ids()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Trigger on approved OR active status
  IF (NEW.account_status IN ('approved', 'active')) AND 
     ((TG_OP = 'INSERT') OR (OLD.account_status IS DISTINCT FROM NEW.account_status)) THEN
    
    IF NEW.student_id IS NULL OR NEW.student_id = '' THEN
      NEW.student_id := generate_student_id();
    END IF;
    
    IF NEW.student_exam_code IS NULL OR NEW.student_exam_code = '' THEN
      NEW.student_exam_code := generate_exam_code();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;
