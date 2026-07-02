export const dynamic = 'force-dynamic'

/**
 * ユーザーがメディア（写真・動画）を送信するAPI
 * クライアントからの直接 INSERT では metadata カラムに権限がない場合があるため、
 * service role で insert して確実に metadata を保存する
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const PHOTO_COST = 0
const VIDEO_COST = 0

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conversationId, mediaUrl, mediaType } = await req.json()
  if (!conversationId || !mediaUrl || !mediaType) {
    return NextResponse.json({ error: 'conversationId, mediaUrl, mediaType required' }, { status: 400 })
  }
  if (!['photo', 'video'].includes(mediaType)) {
    return NextResponse.json({ error: 'mediaType must be photo or video' }, { status: 400 })
  }

  const cost = mediaType === 'video' ? VIDEO_COST : PHOTO_COST
  const admin = adminSupabase()

  // ポイント確認・消費
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

  const metadata = mediaType === 'video'
    ? { video_url: mediaUrl }
    : { image_url: mediaUrl }

  const { data: msg } = await admin.from('messages').insert({
    conversation_id: conversationId,
    sender_role: 'user',
    content: '',
    points_used: 0,
    metadata,
  }).select().single()

  if (!msg) return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })

  // conversations の is_unread_staff と last_message_at を更新
  await admin.from('conversations').update({
    last_message_at: now.toISOString(),
    is_unread_staff: true,
  }).eq('id', conversationId)

  return NextResponse.json({ ok: true, message: msg })
}
