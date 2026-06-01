-- auth.users.last_sign_in_at が更新されたら profiles.last_login_at に自動同期するトリガー
-- これにより email/Google/magic link など全ログイン方法で最終ログインが記録される

CREATE OR REPLACE FUNCTION public.sync_last_login_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET last_login_at = NEW.last_sign_in_at
  WHERE id = NEW.id
    AND NEW.last_sign_in_at IS NOT NULL
    AND (last_login_at IS NULL OR NEW.last_sign_in_at > last_login_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_sign_in ON auth.users;

CREATE TRIGGER on_auth_user_sign_in
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.sync_last_login_at();

-- 既存ユーザーの last_login_at を一括補完（null または古い値を更新）
UPDATE public.profiles p
SET last_login_at = au.last_sign_in_at
FROM auth.users au
WHERE p.id = au.id
  AND au.last_sign_in_at IS NOT NULL
  AND (p.last_login_at IS NULL OR au.last_sign_in_at > p.last_login_at);
