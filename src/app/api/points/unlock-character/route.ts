export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/supabase/get-auth-user'

const UNLOCK_COST = 300

export async function POST() {
  const authClient = createServerClient()
  const user = await getAuthUser(authClient)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile } = await adminClient
    .from('profiles')
    .select('points, bonus_points, bonus_points_expires_at')
    .eq('id', user.id)
    .single()

  const now = new Date()
  const bonusAvailable =
    profile?.bonus_points_expires_at && new Date(profile.bonus_points_expires_at) > now
      ? (profile.bonus_points ?? 0)
      : 0
  const totalPoints = (profile?.points ?? 0) + bonusAvailable

  if (!profile || totalPoints < UNLOCK_COST) {
    return NextResponse.json({ ok: false, error: 'insufficient_points', message: `ポイントが不足しています（必要: ${UNLOCK_COST}pt）` }, { status: 400 })
  }

  // ボーナスptから先に消費
  const bonusDeduct = Math.min(bonusAvailable, UNLOCK_COST)
  const regularDeduct = UNLOCK_COST - bonusDeduct
  const newBonusPoints = bonusAvailable - bonusDeduct
  const newPoints = profile.points - regularDeduct
  const updatePayload: Record<string, number> = { points: newPoints }
  if (bonusDeduct > 0) updatePayload.bonus_points = newBonusPoints

  // ポイント消費 & share_logsに追加（キャラ枠拡張）
  const [{ error: pointsError }, { error: logError }] = await Promise.all([
    adminClient.from('profiles').update(updatePayload).eq('id', user.id),
    adminClient.from('share_logs').insert({ user_id: user.id, tweet_url: `points:unlock:${Date.now()}` }),
  ])

  if (pointsError || logError) {
    return NextResponse.json({ error: pointsError?.message ?? logError?.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: 'キャラクター枠が1つ解放されました！', remainingPoints: newPoints + newBonusPoints })
}
