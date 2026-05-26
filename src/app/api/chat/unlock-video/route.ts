export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const UNLOCK_COST = 50

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messageId } = await req.json()
  if (!messageId) return NextResponse.json({ error: 'messageId required' }, { status: 400 })

  const admin = adminSupabase()

  // すでに解錠済みか確認
  const { data: existing } = await admin
    .from('video_unlocks')
    .select('id')
    .eq('user_id', user.id)
    .eq('message_id', messageId)
    .single()

  if (existing) return NextResponse.json({ ok: true, alreadyUnlocked: true })

  // ポイント確認
  const { data: profile } = await admin
    .from('profiles')
    .select('points, bonus_points, bonus_points_expires_at')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const now = new Date()
  const bonusAvailable =
    profile.bonus_points_expires_at && new Date(profile.bonus_points_expires_at) > now
      ? (profile.bonus_points ?? 0)
      : 0
  const totalPoints = profile.points + bonusAvailable

  if (totalPoints < UNLOCK_COST) {
    return NextResponse.json({ error: 'insufficient_points', current: totalPoints, required: UNLOCK_COST }, { status: 402 })
  }

  // ポイント消費
  const bonusDeduct = Math.min(bonusAvailable, UNLOCK_COST)
  const regularDeduct = UNLOCK_COST - bonusDeduct
  const newBonusPoints = bonusAvailable - bonusDeduct
  const newPoints = profile.points - regularDeduct
  const updatePayload: Record<string, number> = { points: newPoints }
  if (bonusDeduct > 0) updatePayload.bonus_points = newBonusPoints

  await Promise.all([
    admin.from('profiles').update(updatePayload).eq('id', user.id),
    admin.from('point_transactions').insert({
      user_id: user.id,
      amount: -UNLOCK_COST,
      type: 'spend',
      description: '動画視聴',
    }),
    admin.from('video_unlocks').insert({ user_id: user.id, message_id: messageId }),
  ])

  return NextResponse.json({ ok: true, newPoints: newPoints + (newBonusPoints ?? 0) })
}
