-- 既存の英数字user_codeを6桁数字に変換する
-- user_codeが数字のみでない（古い形式）レコードを対象に更新
UPDATE profiles
SET user_code = LPAD((100000 + floor(random() * 900000))::int::text, 6, '0')
WHERE user_code !~ '^\d{6}$';
