-- user_characters: tracks characters a user has activated (sent first message to)
CREATE TABLE IF NOT EXISTS user_characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  activated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, character_id)
);

CREATE INDEX IF NOT EXISTS idx_user_characters_user_id ON user_characters(user_id);

-- share_logs: tracks X (Twitter) share submissions for extra character unlocks
CREATE TABLE IF NOT EXISTS share_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tweet_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_logs_user_id ON share_logs(user_id);

-- RLS
ALTER TABLE user_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_user_characters" ON user_characters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_read_own_share_logs" ON share_logs
  FOR SELECT USING (auth.uid() = user_id);
