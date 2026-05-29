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
    .select('id, image_url, title')
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

  // 重複チェック（unique制約で弾かれるが先にチェックしてエラーメッセージを改善）
  const { data: existing } = await admin
    .from('opegra_sent_log')
    .select('id')
    .eq('photo_id', photoId)
    .eq('user_id', conv.user_id)
    .single()
  if (existing) {
    return NextResponse.json({ error: 'この写真はこのユーザーに送信済みです' }, { status: 409 })
  }

  // メッセージとして送信
  const { data: msg, error: msgErr } = await admin
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_role: 'character',
      content: '',
      points_used: 0,
      is_read: false,
      metadata: { image_url: photo.image_url },
    })
    .select()
    .single()

  if (msgErr || !msg) {
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
  }

  // 送信ログを記録
  await admin.from('opegra_sent_log').insert({
    photo_id: photoId,
    user_id: conv.user_id,
    conversation_id: conversationId,
  })

  // 会話更新
  const now = new Date().toISOString()
  await admin
    .from('conversations')
    .update({ last_message_at: now, is_unread_staff: false })
    .eq('id', conversationId)

  return NextResponse.json({ message: msg })
}
