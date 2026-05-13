-- chat-images ストレージバケット作成（管理者がチャットから画像を送るため）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-images',
  'chat-images',
  true,
  10485760, -- 10MB
  array['image/jpeg','image/png','image/gif','image/webp']
)
on conflict (id) do nothing;

-- staff/admin はアップロード可能
create policy "staff can upload chat images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-images'
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('staff', 'admin')
    )
  );

-- 誰でも閲覧可能（publicバケット）
create policy "public can view chat images"
  on storage.objects for select
  to public
  using (bucket_id = 'chat-images');
