-- admin_users_view に referral_source を追加
CREATE OR REPLACE VIEW admin_users_view AS
SELECT p.id,
    p.user_code,
    p.email,
    p.display_name,
    p.age,
    p.gender,
    p.role,
    p.points,
    p.created_at,
        CASE
            WHEN p.last_login_at > p.created_at THEN p.last_login_at
            ELSE NULL::timestamp with time zone
        END AS last_login_at,
    COALESCE(pt.total_charged, 0::bigint) AS total_charged,
    pt.last_payment_at,
    p.referral_source
   FROM profiles p
     LEFT JOIN ( SELECT point_transactions.user_id,
            sum(point_transactions.amount) AS total_charged,
            max(point_transactions.created_at) AS last_payment_at
           FROM point_transactions
          WHERE point_transactions.type = 'purchase'::text AND point_transactions.description !~~ '%ボーナス%'::text
          GROUP BY point_transactions.user_id) pt ON p.id = pt.user_id
  WHERE p.role = 'user'::text;
