-- メッセージ削除・編集フラグ
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;
