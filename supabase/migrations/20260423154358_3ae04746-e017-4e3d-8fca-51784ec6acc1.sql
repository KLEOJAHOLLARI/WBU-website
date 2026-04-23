-- Add scholarship fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_scholarship boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scholarship_percentage integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS required_open_lecture_hours integer NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS completed_open_lecture_hours integer NOT NULL DEFAULT 0;
