-- キャラクターごとの返信テンプレート
CREATE TABLE IF NOT EXISTS reply_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reply_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage templates" ON reply_templates;
CREATE POLICY "Admins manage templates" ON reply_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );
