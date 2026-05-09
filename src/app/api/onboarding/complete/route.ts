import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/supabase/get-auth-user'

const BONUS_POINTS = 500
const IP_WINDOW_DAYS = 30  // 同一IPの既存アカウント確認期間

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

  const { name, age, gender, referralSource } = await req.json()
  if (!name?.trim() || !age || !gender)
    return NextResponse.json({ error: 'name, age, gender are required' }, { status: 400 })
  if (parseInt(age) < 18)
    return NextResponse.json({ error: '18歳未満はご利用いただけません' }, { status: 400 })

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // プロフィール行の存在確認
  const { data: existing } = await adminClient
    .from('profiles').select('id').eq('id', user.id).single()

  if (!existing) {
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
      if ((count ?? 0) > 0) giveBonus = false
    }

    const points = giveBonus ? BONUS_POINTS : 0
    const { error: insertError } = await adminClient.from('profiles').insert({
      id: user.id,
      email: user.email ?? '',
      user_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
      role: 'user',
      points,
      display_name: name.trim(),
      age: parseInt(age),
      gender,
      registration_ip: ip,
      registration_ua: ua,
      ...(referralSource ? { referral_source: referralSource } : {}),
    })
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    if (giveBonus) {
      await adminClient.from('point_transactions').insert({
        user_id: user.id,
        amount: BONUS_POINTS,
        type: 'purchase',
        description: '新規登録ボーナス',
      })
    }

    return NextResponse.json({ ok: true })
  }

  // 既存行がある場合は onboarding フィールドのみ更新
  const { error } = await adminClient
    .from('profiles')
    .update({ display_name: name.trim(), age: parseInt(age), gender })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
