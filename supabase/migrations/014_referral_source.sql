-- Add referral_source to profiles to track how users found the service
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_source text;
