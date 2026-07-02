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

  await admin.from('video_unlocks').insert({ user_id: user.id, message_id: messageId })

  return NextResponse.json({ ok: true })
}
