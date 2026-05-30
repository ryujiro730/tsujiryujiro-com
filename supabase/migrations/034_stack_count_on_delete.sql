-- メッセージが削除(is_deleted=true)されたとき stack_count を再計算する

create or replace function fn_recalc_stack_count(conv_id uuid)
returns void language plpgsql as $$
declare
  new_count integer;
begin
  -- 最後のユーザーメッセージ以降のキャラメッセージ数を数える
  with latest_user as (
    select max(created_at) as last_user_at
    from messages
    where conversation_id = conv_id
      and sender_role = 'user'
      and (is_deleted is not true)
  )
  select coalesce(
    (select count(*)
     from messages m, latest_user lu
     where m.conversation_id = conv_id
       and m.sender_role = 'character'
       and m.created_at > lu.last_user_at
       and (m.is_deleted is not true)),
    0
  ) into new_count;

  update conversations set stack_count = new_count where id = conv_id;
end;
$$;

-- UPDATE トリガー（is_deleted が true に変わったとき再計算）
create or replace function fn_stack_count_on_update()
returns trigger language plpgsql as $$
begin
  -- is_deleted が false→true に変わったメッセージの場合のみ再計算
  if old.is_deleted is not true and new.is_deleted = true then
    perform fn_recalc_stack_count(new.conversation_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stack_count_on_update on messages;
create trigger trg_stack_count_on_update
  after update on messages
  for each row execute function fn_stack_count_on_update();
