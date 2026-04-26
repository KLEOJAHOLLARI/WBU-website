CREATE TABLE public.document_template_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  display_name text,
  description text,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_template_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage template overrides"
  ON public.document_template_overrides FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated read template overrides"
  ON public.document_template_overrides FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_document_template_overrides_updated_at
  BEFORE UPDATE ON public.document_template_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();