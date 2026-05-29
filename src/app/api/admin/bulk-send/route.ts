export const dynamic = 'force-dynamic'
/**
 * POST /api/admin/bulk-send
 * 検索結果の会話一覧に同じ文言を一括送信する（掘り起こし用）
 * body: { conversationIds: string[], message: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/supabase/get-auth-user'
import { resolveVariables } from '@/lib/message-variables'

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

  const { data: staffProfile } = await authClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (!staffProfile || !['admin', 'staff'].includes(staffProfile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { conversationIds, message }: { conversationIds: string[]; message: string } = body

  if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })
  if (!Array.isArray(conversationIds) || conversationIds.length === 0) {
    return NextResponse.json({ error: 'conversationIds required' }, { status: 400 })
  }
  if (conversationIds.length > 200) {
    return NextResponse.json({ error: '一度に送信できるのは200件までです' }, { status: 400 })
  }

  const admin = adminSupabase()

  // 会話情報・ユーザー情報を一括取得
  const { data: conversations } = await admin
    .from('conversations')
    .select('id, user_id, character_id')
    .in('id', conversationIds)

  if (!conversations?.length) return NextResponse.json({ error: 'No conversations found' }, { status: 404 })

  const userIds = Array.from(new Set(conversations.map(c => c.user_id)))
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, display_name, age, gender')
    .in('id', userIds)

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  // 各会話のメッセージを組み立て
  const now = new Date().toISOString()
  const messages = conversations.map(conv => {
    const profile = profileMap.get(conv.user_id)
    const resolved = resolveVariables(message.trim(), profile ?? {})
    return {
      conversation_id: conv.id,
      sender_role: 'character',
      content: resolved,
      points_used: 0,
      is_read: false,
    }
  })

  // 一括insert
  const { error: insertErr } = await admin.from('messages').insert(messages)
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // 会話を一括更新
  await admin
    .from('conversations')
    .update({ last_message_at: now, is_unread_staff: false })
    .in('id', conversationIds)

  return NextResponse.json({ sent: conversations.length })
}
