-- conversations に最新メッセージのキャッシュ列を追加
-- （adminページで messages の全件取得を不要にするため）
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_content text;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_sender_role text;

-- メッセージが INSERT されたとき自動で conversations を更新するトリガー
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    last_message_content      = NEW.content,
    last_message_sender_role  = NEW.sender_role,
    last_message_at           = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_message_insert ON messages;
CREATE TRIGGER trg_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();
