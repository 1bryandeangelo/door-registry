insert into storage.buckets (id, name, public) values ('door-images', 'door-images', false) on conflict (id) do nothing;
create policy "company members manage door images" on storage.objects for all using (bucket_id = 'door-images' and (storage.foldername(name))[1] = (my_company_id())::text);

insert into storage.buckets (id, name, public) values ('door-files', 'door-files', false) on conflict (id) do nothing;
create policy "company members manage door files" on storage.objects for all using (bucket_id = 'door-files' and (storage.foldername(name))[1] = (my_company_id())::text);

insert into storage.buckets (id, name, public) values ('hw-cutsheets', 'hw-cutsheets', false) on conflict (id) do nothing;
create policy "company members manage hw cutsheets" on storage.objects for all using (bucket_id = 'hw-cutsheets' and (storage.foldername(name))[1] = (my_company_id())::text);

insert into storage.buckets (id, name, public) values ('timeline-photos', 'timeline-photos', false) on conflict (id) do nothing;
create policy "company members manage timeline photos" on storage.objects for all using (bucket_id = 'timeline-photos' and (storage.foldername(name))[1] = (my_company_id())::text);
