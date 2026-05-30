-- bulk_send_schedules の status に processing / failed を追加
-- cronジョブの競合状態防止と失敗追跡のため

alter table bulk_send_schedules
  drop constraint if exists bulk_send_schedules_status_check;

alter table bulk_send_schedules
  add constraint bulk_send_schedules_status_check
  check (status in ('pending', 'processing', 'sent', 'cancelled', 'failed'));
