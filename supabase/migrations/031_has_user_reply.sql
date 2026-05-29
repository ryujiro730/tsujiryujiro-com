-- conversations に has_user_reply フラグを追加
-- ユーザーが1通でも返信した会話のみを「やり取り」として扱う

alter table conversations
  add column if not exists has_user_reply boolean not null default false;

-- 既存データのバックフィル（ユーザーメッセージが1件以上ある会話を true に）
update conversations c
set has_user_reply = true
where exists (
  select 1 from messages m
  where m.conversation_id = c.id
    and m.sender_role = 'user'
    and (m.is_deleted is null or m.is_deleted = false)
);

-- インデックス（検索クエリで絞り込むため）
create index if not exists idx_conversations_has_user_reply
  on conversations(has_user_reply)
  where has_user_reply = true;

-- トリガー：ユーザーメッセージが insert されたら自動で true にセット
create or replace function fn_set_has_user_reply()
returns trigger language plpgsql as $$
begin
  if new.sender_role = 'user' then
    update conversations
    set has_user_reply = true
    where id = new.conversation_id
      and has_user_reply = false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_has_user_reply on messages;
create trigger trg_set_has_user_reply
  after insert on messages
  for each row execute function fn_set_has_user_reply();
