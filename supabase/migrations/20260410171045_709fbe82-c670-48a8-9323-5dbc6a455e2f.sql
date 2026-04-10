
CREATE OR REPLACE FUNCTION public.generate_student_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_year text;
  next_num integer;
  new_id text;
BEGIN
  v_year := to_char(now(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(split_part(student_id, '-', 3), '') AS integer)
  ), 0) + 1
  INTO next_num
  FROM profiles
  WHERE student_id LIKE 'WBU-' || v_year || '-%';
  
  new_id := 'WBU-' || v_year || '-' || lpad(next_num::text, 6, '0');
  RETURN new_id;
END;
$$;
