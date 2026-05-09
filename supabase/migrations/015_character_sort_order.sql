-- Add sort_order to characters for manual ordering
ALTER TABLE characters ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Initialize sort_order based on created_at order
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1 AS rn
  FROM characters
)
UPDATE characters SET sort_order = ranked.rn
FROM ranked WHERE characters.id = ranked.id;
