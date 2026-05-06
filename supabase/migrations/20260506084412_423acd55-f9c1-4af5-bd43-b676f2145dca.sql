ALTER TABLE public.deans_list_snapshots
  ADD COLUMN IF NOT EXISTS list_title text NOT NULL DEFAULT 'Dean''s List';