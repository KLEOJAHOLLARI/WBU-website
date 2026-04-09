-- Add document_url to applications
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS document_url text;

-- Create storage bucket for application documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('application-documents', 'application-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can upload application documents
CREATE POLICY "Anyone can upload application docs"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'application-documents');

-- Anyone can read application documents (for admin viewing)
CREATE POLICY "Anyone can read application docs"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'application-documents');

-- Admins can delete application documents
CREATE POLICY "Admins can delete application docs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'application-documents' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete applications
CREATE POLICY "Admins can delete applications"
ON public.applications FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));