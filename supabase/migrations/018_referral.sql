ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by_user_id uuid REFERENCES profiles(id);
