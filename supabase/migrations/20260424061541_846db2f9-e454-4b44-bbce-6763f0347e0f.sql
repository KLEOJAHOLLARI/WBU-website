
CREATE TABLE public.promo_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  button_text text NOT NULL DEFAULT 'Learn More',
  button_link text NOT NULL DEFAULT '/admissions',
  image_url text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active banners"
  ON public.promo_banners FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert banners"
  ON public.promo_banners FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update banners"
  ON public.promo_banners FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete banners"
  ON public.promo_banners FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.touch_promo_banners_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER promo_banners_set_updated_at
  BEFORE UPDATE ON public.promo_banners
  FOR EACH ROW EXECUTE FUNCTION public.touch_promo_banners_updated_at();

INSERT INTO public.promo_banners (title, description, button_text, button_link, image_url, sort_order) VALUES
('Apply for Scholarships', 'WBU, with the support of American Hospitals Group and International Hygeia Hospital, offers Excellence Scholarships for all bachelor and integrated programs for the 2026-2027 academic year.', 'Learn More', '/admissions', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1920&q=80', 1),
('Study Medicine', 'The Integrated Second Cycle Program in Medicine is a unique program offered by Western Balkan University with curriculum design assisted by the University of Cambridge.', 'Learn More', '/programs', 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1920&q=80', 2),
('Study Computer Science & AI', 'Build the future with cutting-edge programs in Software Engineering, Data Science and Artificial Intelligence taught by industry-experienced faculty.', 'Explore Program', '/programs', 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&q=80', 3);
