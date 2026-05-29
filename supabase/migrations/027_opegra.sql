-- オペグラ（オペレーター用グラビア写真ライブラリ）
create table if not exists opegra_photos (
  id uuid primary key default gen_random_uuid(),
  character_id uuid references characters(id) on delete set null, -- null = 汎用
  title text not null default '',
  image_url text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 送信履歴（重複送信防止）
-- unique(photo_id, user_id) = 同一写真は同一ユーザーに1回のみ送信可
create table if not exists opegra_sent_log (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references opegra_photos(id) on delete cascade,
  user_id uuid not null,
  conversation_id uuid not null references conversations(id) on delete cascade,
  sent_at timestamptz not null default now(),
  unique(photo_id, user_id)
);

alter table opegra_photos enable row level security;
alter table opegra_sent_log enable row level security;

-- アクセスはすべてservice role経由（APIルート）
-- 認証ユーザーからの直接クエリは不可
