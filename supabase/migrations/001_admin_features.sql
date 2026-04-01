-- Admin features migration

-- 1. Add admin_note to profiles (only visible in admin UI)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_note text;

-- 2. Add staff_note to conversations (per-conversation operator memo)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS staff_note text;

-- 3. Add price_yen to point_transactions (record yen amount at purchase time)
ALTER TABLE point_transactions ADD COLUMN IF NOT EXISTS price_yen integer;

-- 4. Admin labels master table
CREATE TABLE IF NOT EXISTS admin_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);

-- 5. User label assignments (many-to-many)
CREATE TABLE IF NOT EXISTS user_label_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES admin_labels(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, label_id)
);

-- RLS: admin_labels and user_label_assignments are admin-only
ALTER TABLE admin_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_label_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins only" ON admin_labels;
CREATE POLICY "Admins only" ON admin_labels
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

DROP POLICY IF EXISTS "Admins only" ON user_label_assignments;
CREATE POLICY "Admins only" ON user_label_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- Insert default labels
INSERT INTO admin_labels (name, color) VALUES
  ('VIP', '#f59e0b'),
  ('要注意', '#ef4444'),
  ('優良顧客', '#10b981'),
  ('新規', '#6366f1'),
  ('休眠', '#6b7280')
ON CONFLICT (name) DO NOTHING;
