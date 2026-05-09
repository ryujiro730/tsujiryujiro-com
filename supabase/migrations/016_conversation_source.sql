-- Track whether a conversation was started by the user or by auto-broadcast
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'user';
-- 'user'           : ユーザーがキャラを選んで開始（ウェルカムメッセージあり）
-- 'auto_broadcast' : cronが自動同報で会話を作成
