-- Add welcome_message to characters
-- Sent automatically as the first message when a user starts a new conversation
ALTER TABLE characters ADD COLUMN IF NOT EXISTS welcome_message text;
