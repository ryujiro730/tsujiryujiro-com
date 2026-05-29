-- 積み数：最後のユーザーメッセージ以降にキャラが送った連続メッセージ数
-- ユーザー返信 → リセット(0)、キャラ送信 → +1

alter table conversations
  add column if not exists stack_count integer not null default 0;

create index if not exists idx_conversations_stack_count
  on conversations(stack_count);

-- 既存データのバックフィル
-- 各会話について「最後のユーザーメッセージ以降のキャラメッセージ数」を算出
with latest_user as (
  select
    conversation_id,
    max(created_at) as last_user_at
  from messages
  where sender_role = 'user'
    and (is_deleted is not true)
  group by conversation_id
),
char_after_user as (
  select
    m.conversation_id,
    count(*) as cnt
  from messages m
  join latest_user lu on m.conversation_id = lu.conversation_id
  where m.sender_role = 'character'
    and m.created_at > lu.last_user_at
    and (m.is_deleted is not true)
  group by m.conversation_id
)
update conversations c
set stack_count = coalesce(
  (select cnt from char_after_user cau where cau.conversation_id = c.id),
  0
);

-- トリガー関数
create or replace function fn_update_stack_count()
returns trigger language plpgsql as $$
begin
  if new.sender_role = 'user' then
    -- ユーザーが返信 → リセット
    update conversations
    set stack_count = 0
    where id = new.conversation_id;
  elsif new.sender_role = 'character' then
    -- キャラが送信 → +1
    update conversations
    set stack_count = stack_count + 1
    where id = new.conversation_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_update_stack_count on messages;
create trigger trg_update_stack_count
  after insert on messages
  for each row execute function fn_update_stack_count();
