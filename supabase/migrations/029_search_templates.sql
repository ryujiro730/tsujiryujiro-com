-- やり取り検索テンプレート
create table if not exists search_templates (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  params jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table search_templates enable row level security;
-- service role経由のみアクセス
