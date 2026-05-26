-- メッセージ挿入トリガーを改善
-- 1. ユーザー送信時に is_unread_staff = true をセット
-- 2. content が空のメディアメッセージはメタデータからラベルを生成
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
DECLARE
  display_content text;
BEGIN
  -- contentが空のとき、metadataからラベルを生成
  IF NEW.content IS NULL OR NEW.content = '' THEN
    IF NEW.metadata->>'video_url' IS NOT NULL THEN
      display_content := '📹 動画';
    ELSIF NEW.metadata->>'image_url' IS NOT NULL THEN
      display_content := '📷 写真';
    ELSE
      display_content := '';
    END IF;
  ELSE
    display_content := NEW.content;
  END IF;

  UPDATE conversations
  SET
    last_message_content     = display_content,
    last_message_sender_role = NEW.sender_role,
    last_message_at          = NEW.created_at,
    -- ユーザー送信なら未読フラグを立てる
    is_unread_staff = CASE
      WHEN NEW.sender_role = 'user' THEN true
      ELSE is_unread_staff
    END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_message_insert ON messages;
CREATE TRIGGER trg_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();
