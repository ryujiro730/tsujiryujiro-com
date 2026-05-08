-- auto_broadcast_steps に画像URLカラムを追加
ALTER TABLE auto_broadcast_steps ADD COLUMN IF NOT EXISTS image_url TEXT;
