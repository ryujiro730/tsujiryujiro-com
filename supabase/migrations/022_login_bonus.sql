ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bonus_points INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_points_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_bonus_at DATE;
