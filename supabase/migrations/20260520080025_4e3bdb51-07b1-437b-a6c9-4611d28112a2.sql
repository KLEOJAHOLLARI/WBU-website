
insert into storage.buckets (id, name, public) values ('hero-media', 'hero-media', true) on conflict (id) do nothing;

create policy "Public read hero-media" on storage.objects for select using (bucket_id = 'hero-media');
create policy "Admins upload hero-media" on storage.objects for insert to authenticated with check (bucket_id = 'hero-media' and has_role(auth.uid(), 'admin'::app_role));
create policy "Admins update hero-media" on storage.objects for update to authenticated using (bucket_id = 'hero-media' and has_role(auth.uid(), 'admin'::app_role));
create policy "Admins delete hero-media" on storage.objects for delete to authenticated using (bucket_id = 'hero-media' and has_role(auth.uid(), 'admin'::app_role));

insert into public.system_settings (key, value) values ('hero_media', '{"type":"image","url":""}'::jsonb) on conflict (key) do nothing;
