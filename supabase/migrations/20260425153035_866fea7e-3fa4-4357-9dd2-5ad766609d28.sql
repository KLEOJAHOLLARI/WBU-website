
-- Storage bucket for generated documents (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-documents', 'generated-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Table
CREATE TABLE IF NOT EXISTS public.generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('certificate','letter','contract','acceptance_letter')),
  template_key text NOT NULL,
  title text NOT NULL,
  reference_code text NOT NULL UNIQUE DEFAULT ('DOC-' || to_char(now(),'YYYYMMDD') || '-' || upper(substring(md5(random()::text),1,6))),
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  file_path text NOT NULL,
  status text NOT NULL DEFAULT 'issued',
  issued_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_documents_user ON public.generated_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_type ON public.generated_documents(document_type);

ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all generated documents"
  ON public.generated_documents FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students view own generated documents"
  ON public.generated_documents FOR SELECT
  USING (auth.uid() = user_id);

-- updated_at trigger (reuse pattern)
CREATE OR REPLACE FUNCTION public.touch_generated_documents()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_generated_documents_touch ON public.generated_documents;
CREATE TRIGGER trg_generated_documents_touch
  BEFORE UPDATE ON public.generated_documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_generated_documents();

-- Storage policies for generated-documents bucket
CREATE POLICY "Admins read generated-documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'generated-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins write generated-documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'generated-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update generated-documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'generated-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete generated-documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'generated-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students read own generated-documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'generated-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
