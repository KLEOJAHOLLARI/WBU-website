
-- Add avatar and pending email columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pending_email text;

-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view profile photos
CREATE POLICY "Anyone can view profile photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

-- Users can upload their own profile photo (folder = user_id)
CREATE POLICY "Users can upload own profile photo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can update their own profile photo
CREATE POLICY "Users can update own profile photo"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own profile photo
CREATE POLICY "Users can delete own profile photo"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
