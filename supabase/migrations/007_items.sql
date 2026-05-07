-- Items feature migration

-- 1. items master table (admin管理)
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  price_points integer NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: 読み取りは全認証ユーザー、書き込みはadmin/staffのみ
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read active items" ON items;
CREATE POLICY "Anyone can read active items" ON items
  FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Admins manage items" ON items;
CREATE POLICY "Admins manage items" ON items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- 2. user_items (inventory)
CREATE TABLE IF NOT EXISTS user_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id)
);

-- RLS: 自分のインベントリのみ
ALTER TABLE user_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own inventory" ON user_items;
CREATE POLICY "Users manage own inventory" ON user_items
  FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins read all inventory" ON user_items;
CREATE POLICY "Admins read all inventory" ON user_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- 3. messages に metadata カラムを追加（アイテム使用時の情報格納用）
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata jsonb;
