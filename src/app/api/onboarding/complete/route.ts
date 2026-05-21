export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/supabase/get-auth-user'

const REGISTRATION_BONUS = 60
const EARLY_BONUS = 200
const IP_WINDOW_DAYS = 30
const REFERRAL_BONUS = 1000

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function applyReferralBonus(adminClient: any, newUserId: string, refCode: string, newUserIp: string) {
  // 紹介者を user_code で検索
  const { data: referrer } = await adminClient
    .from('profiles')
    .select('id, registration_ip, points, role')
    .eq('user_code', refCode)
    .single()

  if (!referrer) return                                  // 紹介コードが存在しない
  if (referrer.id === newUserId) return                  // セルフバック防止
  if (referrer.role === 'admin' || referrer.role === 'staff') return  // 管理者は対象外
  if (newUserIp !== 'unknown' && referrer.registration_ip === newUserIp) return  // 同一IP防止

  // 被紹介者が既に紹介済みでないか確認（二重適用防止）
  const { data: newUserProfile } = await adminClient
    .from('profiles').select('referred_by_user_id').eq('id', newUserId).single()
  if (newUserProfile?.referred_by_user_id) return        // 既に紹介済み

  // 両者にボーナス付与
  await Promise.all([
    // 紹介者
    adminClient.from('profiles').update({ points: referrer.points + REFERRAL_BONUS }).eq('id', referrer.id),
    adminClient.from('point_transactions').insert({
      user_id: referrer.id, amount: REFERRAL_BONUS, type: 'purchase', description: '友達紹介ボーナス',
    }),
    // 被紹介者
    adminClient.from('profiles').update({ referred_by_user_id: referrer.id }).eq('id', newUserId),
    adminClient.from('point_transactions').insert({
      user_id: newUserId, amount: REFERRAL_BONUS, type: 'purchase', description: '紹介登録ボーナス',
    }),
  ])

  // 被紹介者のポイントも更新（insert後なのでupdateで加算）
  const { data: newProfile } = await adminClient
    .from('profiles').select('points').eq('id', newUserId).single()
  await adminClient.from('profiles')
    .update({ points: (newProfile?.points ?? 0) + REFERRAL_BONUS })
    .eq('id', newUserId)
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function POST(req: NextRequest) {
  const authClient = createServerClient()
  const user = await getAuthUser(authClient)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, age, gender, referralSource, referralByCode } = await req.json()
  if (!name?.trim() || !age || !gender)
    return NextResponse.json({ error: 'name, age, gender are required' }, { status: 400 })
  if (parseInt(age) < 18)
    return NextResponse.json({ error: '18歳未満はご利用いただけません' }, { status: 400 })

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // プロフィール行の存在確認（age === null はcallbackで作ったスケルトン）
  const { data: existing } = await adminClient
    .from('profiles').select('id, age').eq('id', user.id).single()

  const isNewUser = !existing || existing.age === null

  if (isNewUser) {
    const ip = getClientIp(req)
    const ua = req.headers.get('user-agent') ?? ''

    // 同IPで既存アカウントがあればボーナスなし
    let giveBonus = true
    if (ip !== 'unknown') {
      const since = new Date(Date.now() - IP_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
      const { count } = await adminClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('registration_ip', ip)
        .gte('created_at', since)
      if ((count ?? 0) > 1) giveBonus = false  // 自分自身のスケルトンが1件あるので>1
    }

    const totalPoints = giveBonus ? REGISTRATION_BONUS + EARLY_BONUS : 0

    if (!existing) {
      // スケルトンなし（旧フロー）→ insert
      const { error: insertError } = await adminClient.from('profiles').insert({
        id: user.id,
        email: user.email ?? '',
        user_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
        role: 'user',
        points: totalPoints,
        display_name: name.trim(),
        age: parseInt(age),
        gender,
        registration_ip: ip,
        registration_ua: ua,
        ...(referralSource ? { referral_source: referralSource } : {}),
      })
      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    } else {
      // スケルトンあり（callbackで作成済み）→ update
      const { error: updateError } = await adminClient.from('profiles').update({
        points: totalPoints,
        display_name: name.trim(),
        age: parseInt(age),
        gender,
        registration_ip: ip,
        registration_ua: ua,
        ...(referralSource ? { referral_source: referralSource } : {}),
      }).eq('id', user.id)
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (giveBonus) {
      await adminClient.from('point_transactions').insert([
        { user_id: user.id, amount: REGISTRATION_BONUS, type: 'purchase', description: '新規登録ボーナス' },
        { user_id: user.id, amount: EARLY_BONUS, type: 'purchase', description: '早期登録ボーナス' },
      ])
    }

    // 紹介ボーナス処理
    if (referralByCode && giveBonus) {
      await applyReferralBonus(adminClient, user.id, referralByCode, ip)
    }

    return NextResponse.json({ ok: true })
  }

  // onboarding完了済み → 名前・年齢・性別のみ更新
  const { error } = await adminClient
    .from('profiles')
    .update({ display_name: name.trim(), age: parseInt(age), gender })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
