-- 自動同報シーケンス（キャラクターごと）
create table if not exists auto_broadcast_sequences (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references characters(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table auto_broadcast_sequences enable row level security;
create policy "admin/staff can manage auto_broadcast_sequences"
  on auto_broadcast_sequences for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'staff'))
  );

-- 各ステップ（登録からの遅延時間とメッセージ）
create table if not exists auto_broadcast_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references auto_broadcast_sequences(id) on delete cascade,
  step_number int not null,
  delay_minutes int not null,
  message text not null,
  created_at timestamptz not null default now(),
  unique(sequence_id, step_number)
);

alter table auto_broadcast_steps enable row level security;
create policy "admin/staff can manage auto_broadcast_steps"
  on auto_broadcast_steps for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'staff'))
  );

-- 送信キュー・ログ（ユーザーごと、ステップごとに1行）
create table if not exists auto_broadcast_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  step_id uuid not null references auto_broadcast_steps(id) on delete cascade,
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  status text not null default 'pending', -- pending / sent / failed
  conversation_id uuid,
  error_message text,
  created_at timestamptz not null default now(),
  unique(user_id, step_id)
);

alter table auto_broadcast_logs enable row level security;
create policy "admin/staff can read auto_broadcast_logs"
  on auto_broadcast_logs for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'staff'))
  );
-- insert/update は service role（cron）のみ
