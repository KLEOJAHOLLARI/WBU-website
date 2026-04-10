-- Add is_shared flag to courses
ALTER TABLE public.courses ADD COLUMN is_shared boolean NOT NULL DEFAULT false;

-- Add current academic year and semester to student profiles
ALTER TABLE public.profiles ADD COLUMN current_year integer NOT NULL DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN current_semester integer NOT NULL DEFAULT 1;