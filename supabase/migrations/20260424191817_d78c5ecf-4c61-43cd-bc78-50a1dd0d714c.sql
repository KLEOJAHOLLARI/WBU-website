CREATE TABLE public.professor_id_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  verification_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  reissue_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.professor_id_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professors view own card"
ON public.professor_id_cards FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all professor cards"
ON public.professor_id_cards FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_professor_id_cards_updated_at
BEFORE UPDATE ON public.professor_id_cards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.auto_create_professor_id_card()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role = 'professor' THEN
    INSERT INTO public.professor_id_cards (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_create_professor_id_card_trigger
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.auto_create_professor_id_card();

INSERT INTO public.professor_id_cards (user_id)
SELECT user_id FROM public.user_roles WHERE role = 'professor'
ON CONFLICT (user_id) DO NOTHING;