-- Create public storage bucket for promo banner images
insert into storage.buckets (id, name, public)
values ('promo-banners', 'promo-banners', true)
on conflict (id) do nothing;

-- Public can read banner images
create policy "Promo banner images are publicly accessible"
on storage.objects for select
using (bucket_id = 'promo-banners');

-- Admins can upload
create policy "Admins can upload promo banner images"
on storage.objects for insert
with check (bucket_id = 'promo-banners' and public.has_role(auth.uid(), 'admin'));

-- Admins can update
create policy "Admins can update promo banner images"
on storage.objects for update
using (bucket_id = 'promo-banners' and public.has_role(auth.uid(), 'admin'));

-- Admins can delete
create policy "Admins can delete promo banner images"
on storage.objects for delete
using (bucket_id = 'promo-banners' and public.has_role(auth.uid(), 'admin'));