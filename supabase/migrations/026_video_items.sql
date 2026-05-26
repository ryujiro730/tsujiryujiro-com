create table if not exists public.video_items (
  id uuid primary key default gen_random_uuid(),
  character_id uuid references public.characters(id) on delete set null,
  title text not null,
  description text,
  price_points int not null default 100,
  video_url text not null,
  thumbnail_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz default now()
);
alter table public.video_items enable row level security;
create policy "authenticated can view active video items"
  on public.video_items for select to authenticated using (is_active = true);
create policy "service role full access video_items"
  on public.video_items to service_role using (true) with check (true);

create table if not exists public.video_item_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_item_id uuid not null references public.video_items(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, video_item_id)
);
alter table public.video_item_purchases enable row level security;
create policy "users can view own video purchases"
  on public.video_item_purchases for select to authenticated using (user_id = auth.uid());
create policy "users can insert own video purchases"
  on public.video_item_purchases for insert to authenticated with check (user_id = auth.uid());
create policy "service role full access video_item_purchases"
  on public.video_item_purchases to service_role using (true) with check (true);
