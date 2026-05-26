-- chat-imagesバケットにビデオ対応追加（100MBまで、動画MIMEタイプ追加）
update storage.buckets
set
  file_size_limit = 104857600,
  allowed_mime_types = array[
    'image/jpeg','image/png','image/gif','image/webp',
    'video/mp4','video/quicktime','video/webm','video/x-m4v'
  ]
where id = 'chat-images';

-- ユーザーが自分のフォルダに動画をアップロードできるポリシー
create policy "users can upload own videos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-images'
    and name like 'user-videos/' || auth.uid()::text || '/%'
  );

-- ユーザーが視聴解除した動画を追跡するテーブル
create table if not exists public.video_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, message_id)
);

alter table public.video_unlocks enable row level security;

create policy "users can view own video unlocks"
  on public.video_unlocks for select
  to authenticated
  using (user_id = auth.uid());

create policy "users can insert own video unlocks"
  on public.video_unlocks for insert
  to authenticated
  with check (user_id = auth.uid());

-- service_roleは全操作可能
create policy "service role full access to video_unlocks"
  on public.video_unlocks
  to service_role
  using (true)
  with check (true);
