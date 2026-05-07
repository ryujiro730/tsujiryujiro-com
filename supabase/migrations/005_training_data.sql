-- AI学習データ保存テーブル
-- 会話ごとにLLMファインチューニング用のデータを蓄積する

CREATE TABLE IF NOT EXISTS training_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  system_prompt text,
  -- LLM fine-tuning形式: [{role: "user"|"assistant", content: "..."}]
  messages jsonb NOT NULL DEFAULT '[]',
  message_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- conversation_idでupsert検索できるようにインデックス
CREATE UNIQUE INDEX IF NOT EXISTS training_data_conversation_id_idx ON training_data(conversation_id);

-- RLS: adminのみ参照可能（ユーザーは自分のデータにアクセス不可）
ALTER TABLE training_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins only" ON training_data;
CREATE POLICY "Admins only" ON training_data
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );
