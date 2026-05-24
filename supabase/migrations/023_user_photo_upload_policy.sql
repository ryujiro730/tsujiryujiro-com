-- ユーザーが自分のフォルダ（user-photos/{uid}/）に画像をアップロードできるポリシー
create policy "users can upload own photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-images'
    and name like 'user-photos/' || auth.uid()::text || '/%'
  );
