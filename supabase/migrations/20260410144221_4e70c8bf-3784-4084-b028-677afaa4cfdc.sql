
-- Function to generate next WBU student ID
CREATE OR REPLACE FUNCTION public.generate_student_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_year text;
  next_num integer;
  new_id text;
BEGIN
  current_year := to_char(now(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(split_part(student_id, '-', 3), '') AS integer)
  ), 0) + 1
  INTO next_num
  FROM profiles
  WHERE student_id LIKE 'WBU-' || current_year || '-%';
  
  new_id := 'WBU-' || current_year || '-' || lpad(next_num::text, 6, '0');
  RETURN new_id;
END;
$$;

-- Function to generate unique exam code
CREATE OR REPLACE FUNCTION public.generate_exam_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    new_code := '';
    FOR i IN 1..8 LOOP
      new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM profiles WHERE student_exam_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Trigger function to auto-assign IDs
CREATE OR REPLACE FUNCTION public.auto_assign_student_ids()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only for students (check user_roles or on approval)
  IF (NEW.account_status = 'approved') AND 
     ((TG_OP = 'INSERT') OR (OLD.account_status IS DISTINCT FROM 'approved')) THEN
    
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

-- Create trigger
CREATE TRIGGER trg_auto_assign_student_ids
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_student_ids();
