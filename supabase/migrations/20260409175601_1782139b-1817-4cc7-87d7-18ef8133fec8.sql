
-- Function to auto-enroll a student in all courses of their program
CREATE OR REPLACE FUNCTION public.auto_enroll_student_in_program()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only act when program is set or changed
  IF (TG_OP = 'INSERT' AND NEW.program IS NOT NULL) OR 
     (TG_OP = 'UPDATE' AND NEW.program IS DISTINCT FROM OLD.program AND NEW.program IS NOT NULL) THEN
    
    -- Check if user has 'user' role (student)
    IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = NEW.user_id AND role = 'user') THEN
      -- Remove old enrollments if program changed (only enrollments for courses NOT in new program)
      IF TG_OP = 'UPDATE' AND OLD.program IS NOT NULL AND OLD.program IS DISTINCT FROM NEW.program THEN
        DELETE FROM enrollments 
        WHERE user_id = NEW.user_id 
        AND course_id IN (
          SELECT id FROM courses WHERE program = OLD.program
        )
        AND course_id NOT IN (
          SELECT id FROM courses WHERE program = NEW.program
        );
      END IF;
      
      -- Insert enrollments for all courses in the new program (skip duplicates)
      INSERT INTO enrollments (user_id, course_id)
      SELECT NEW.user_id, c.id
      FROM courses c
      WHERE c.program = NEW.program
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
CREATE TRIGGER trigger_auto_enroll_on_program_change
AFTER INSERT OR UPDATE OF program ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_enroll_student_in_program();

-- Also create a function to auto-enroll all existing students in a course when a new course is added to a program
CREATE OR REPLACE FUNCTION public.auto_enroll_on_new_course()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.program IS DISTINCT FROM OLD.program) THEN
    -- Enroll all students who have this program
    INSERT INTO enrollments (user_id, course_id)
    SELECT p.user_id, NEW.id
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.user_id AND ur.role = 'user'
    WHERE p.program = NEW.program
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on courses table
CREATE TRIGGER trigger_auto_enroll_on_new_course
AFTER INSERT OR UPDATE OF program ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.auto_enroll_on_new_course();

-- Add unique constraint on enrollments to support ON CONFLICT DO NOTHING
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_user_course_unique UNIQUE (user_id, course_id);
