-- Storage bucket for admin signatures (private; signed URLs only)
INSERT INTO storage.buckets (id, name, public)
VALUES ('transcript-signatures', 'transcript-signatures', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: only admins can read or modify signatures
CREATE POLICY "Admins can read transcript signatures"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'transcript-signatures'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can upload transcript signatures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'transcript-signatures'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update transcript signatures"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'transcript-signatures'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete transcript signatures"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'transcript-signatures'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Seed default transcript signature settings (idempotent)
INSERT INTO public.system_settings (key, value)
VALUES (
  'transcript_signature',
  jsonb_build_object(
    'enabled', false,
    'admin_user_id', null,
    'admin_name', '',
    'title', 'Registrar',
    'label', 'Verified by Administration',
    'signature_path', null
  )
)
ON CONFLICT (key) DO NOTHING;