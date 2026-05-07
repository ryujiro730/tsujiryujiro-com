-- Item categories migration

-- 1. item_categories テーブル
CREATE TABLE IF NOT EXISTS item_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: 読み取りは全認証ユーザー、書き込みはadmin/staffのみ
ALTER TABLE item_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read categories" ON item_categories;
CREATE POLICY "Anyone can read categories" ON item_categories
  FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Admins manage categories" ON item_categories;
CREATE POLICY "Admins manage categories" ON item_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- 2. items に category_id カラムを追加
ALTER TABLE items ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES item_categories(id) ON DELETE SET NULL;
