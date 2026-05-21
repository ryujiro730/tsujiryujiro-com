export const dynamic = 'force-dynamic'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const BONUS_AMOUNT = 2
const BONUS_DAYS = 30

export async function POST() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('points, bonus_points, bonus_points_expires_at, last_login_bonus_at')
    .eq('id', userId)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const today = new Date().toISOString().split('T')[0]

  // すでに今日受け取り済み
  if (profile.last_login_bonus_at === today) {
    return NextResponse.json({ awarded: false })
  }

  const now = new Date()
  const expiresAt = new Date(now)
  expiresAt.setDate(expiresAt.getDate() + BONUS_DAYS)

  // 期限切れのボーナスポイントはリセット
  const existingBonus =
    profile.bonus_points_expires_at && new Date(profile.bonus_points_expires_at) < now
      ? 0
      : (profile.bonus_points ?? 0)

  const newBonusPoints = existingBonus + BONUS_AMOUNT

  await Promise.all([
    admin
      .from('profiles')
      .update({
        bonus_points: newBonusPoints,
        bonus_points_expires_at: expiresAt.toISOString(),
        last_login_bonus_at: today,
      })
      .eq('id', userId),
    admin.from('point_transactions').insert({
      user_id: userId,
      amount: BONUS_AMOUNT,
      type: 'login_bonus',
      description: 'ログインボーナス',
    }),
  ])

  return NextResponse.json({
    awarded: true,
    bonus_points: newBonusPoints,
    expires_at: expiresAt.toISOString(),
    regular_points: profile.points,
  })
}
