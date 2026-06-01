-- point_transactions の type チェック制約に admin_adjust を追加
ALTER TABLE point_transactions
  DROP CONSTRAINT IF EXISTS point_transactions_type_check;

ALTER TABLE point_transactions
  ADD CONSTRAINT point_transactions_type_check
  CHECK (type IN ('purchase', 'spend', 'login_bonus', 'admin_adjust'));
