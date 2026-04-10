-- Add ECTS credits column to courses table
ALTER TABLE public.courses ADD COLUMN ects integer NOT NULL DEFAULT 6;