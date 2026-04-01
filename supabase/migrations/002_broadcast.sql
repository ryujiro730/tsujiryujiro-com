CREATE TABLE IF NOT EXISTS broadcast_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  message text NOT NULL,
  -- フィルター条件（保存用）
  exclude_with_conversation boolean NOT NULL DEFAULT true,
  filter_registered_from date,
  filter_registered_to date,
  filter_charged_min integer,
  filter_charged_max integer,
  filter_gender text,
  filter_age_min integer,
  filter_age_max integer,
  -- スケジュール
  scheduled_at timestamptz,
  -- ステータス
  status text NOT NULL DEFAULT 'pending',  -- pending / processing / done / failed
  target_count integer,
  sent_count integer NOT NULL DEFAULT 0,
  error_message text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: admin/staff only
ALTER TABLE broadcast_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins only" ON broadcast_jobs;
CREATE POLICY "Admins only" ON broadcast_jobs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );
