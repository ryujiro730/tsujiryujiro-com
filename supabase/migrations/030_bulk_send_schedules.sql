create table if not exists bulk_send_schedules (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references profiles(id) on delete cascade,
  conversation_ids jsonb not null default '[]',  -- string[]
  message text not null,
  scheduled_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'cancelled')),
  sent_at timestamptz,
  sent_count integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_bulk_send_schedules_status_scheduled
  on bulk_send_schedules(status, scheduled_at)
  where status = 'pending';

alter table bulk_send_schedules enable row level security;
