insert into storage.buckets (id, name, public)
values ('workout-images', 'workout-images', false);

create policy "Users can upload own images"
  on storage.objects for insert
  with check (
    bucket_id = 'workout-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can read own images"
  on storage.objects for select
  using (
    bucket_id = 'workout-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own images"
  on storage.objects for delete
  using (
    bucket_id = 'workout-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
