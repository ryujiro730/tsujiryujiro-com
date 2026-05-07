-- パフォーマンス改善用インデックス

-- 受信トレイ: 未返信フィルター + 時系列ソート（最もよく使うクエリ）
CREATE INDEX IF NOT EXISTS idx_conversations_unread_time
  ON conversations (is_unread_staff, last_message_at DESC);

-- 全件時系列ソート
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at
  ON conversations (last_message_at DESC);

-- メッセージ: 会話IDで絞り込み + 時系列ソート
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages (conversation_id, created_at DESC);

-- メッセージ: 未読フィルター
CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON messages (conversation_id, is_read) WHERE is_read = false;

-- ユーザー検索
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON profiles (role);

-- point_transactions: ユーザー別集計
CREATE INDEX IF NOT EXISTS idx_point_transactions_user
  ON point_transactions (user_id, created_at DESC);
