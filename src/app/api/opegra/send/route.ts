export const dynamic = 'force-dynamic'
/**
 * POST /api/opegra/send
 * 写真を送信してsent_logに記録する
 * body: { photoId, conversationId }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/supabase/get-auth-user'

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  const authClient = createServerClient()
  const user = await getAuthUser(authClient)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await authClient.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { photoId, conversationId } = body
  if (!photoId || !conversationId) {
    return NextResponse.json({ error: 'photoId and conversationId required' }, { status: 400 })
  }

  const admin = adminSupabase()

  // 写真情報取得
  const { data: photo } = await admin
    .from('opegra_photos')
    .select('id, image_url, title, media_type')
    .eq('id', photoId)
    .single()
  if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 })

  // 会話のuser_idを取得
  const { data: conv } = await admin
    .from('conversations')
    .select('user_id, character_id')
    .eq('id', conversationId)
    .single()
  if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

  // 送信ログをまず記録（unique制約でアトミックに重複防止）
  // メッセージ保存より先に行うことで、ログINSERT成功した場合のみメッセージを送れる
  const { error: logErr } = await admin.from('opegra_sent_log').insert({
    photo_id: photoId,
    user_id: conv.user_id,
    conversation_id: conversationId,
  })
  if (logErr) {
    // unique制約違反 = 送信済み
    const isDuplicate = logErr.code === '23505'
    return NextResponse.json(
      { error: isDuplicate ? 'この写真はこのユーザーに送信済みです' : logErr.message },
      { status: isDuplicate ? 409 : 500 }
    )
  }

  // ログ記録成功後にメッセージ保存
  const isVideo = photo.media_type === 'video'
  const { data: msg, error: msgErr } = await admin
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_role: 'character',
      content: '',
      points_used: 0,
      is_read: false,
      metadata: isVideo
        ? { video_url: photo.image_url }
        : { image_url: photo.image_url },
    })
    .select()
    .single()

  if (msgErr || !msg) {
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
  }

  // 会話更新
  const now = new Date().toISOString()
  await admin
    .from('conversations')
    .update({ last_message_at: now, is_unread_staff: false })
    .eq('id', conversationId)

  return NextResponse.json({ message: msg })
}
