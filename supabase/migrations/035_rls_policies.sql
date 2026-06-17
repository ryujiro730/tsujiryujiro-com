-- search_templates: service role のみアクセス可（anon/authenticated からは拒否）
-- RLSは有効だがポリシー未定義だとデフォルト全拒否になるため、明示的に定義する

-- search_templates はadmin APIルート経由(service role)でのみ操作するため
-- 一般ユーザーからのアクセスをすべて拒否
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'search_templates' and policyname = 'service_role_only'
  ) then
    execute 'create policy service_role_only on search_templates
      as restrictive
      for all
      to authenticated
      using (false)';
  end if;
end;
$$;

-- opegra_sent_log の user_id に外部キー制約を追加（ユーザー削除時にログも削除）　　　　　　　　　　　
alter table opegra_sent_log
  drop constraint if exists opegra_sent_log_user_id_fkey;

alter table opegra_sent_log
  add constraint opegra_sent_log_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;
