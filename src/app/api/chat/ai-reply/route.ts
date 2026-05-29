export const dynamic = 'force-dynamic'
/**
 * AI自動返信APIルート
 * POST /api/chat/ai-reply
 *
 * ユーザーがメッセージを送った後にフロントから呼ばれる。
 * キャラクターのシステムプロンプト + 会話履歴をLLMに渡し、
 * 返信をDBに保存してリアルタイム配信する。
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/supabase/get-auth-user'
import { generateReply, type LLMMessage } from '@/lib/llm-service'
import { sendNotificationEmail } from '@/lib/send-notification-email'

/** サービスロールクライアント（RLS無視でinsert可能） */
function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  // 認証チェック
  const authClient = createServerClient()
  const user = await getAuthUser(authClient)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // リクエストボディ
  let body: { conversationId: string; characterId: string; userMessage: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { conversationId, characterId, userMessage } = body
  if (!conversationId || !characterId || !userMessage?.trim()) {
    return NextResponse.json({ error: 'conversationId, characterId, userMessage are required' }, { status: 400 })
  }
  if (userMessage.trim().length > 300) {
    return NextResponse.json({ error: 'メッセージは300文字以内にしてください' }, { status: 400 })
  }

  const admin = adminSupabase()

  // キャラクター情報取得（system_prompt含む）
  const { data: character, error: charErr } = await admin
    .from('characters')
    .select('id, name, age, description, personality, system_prompt')
    .eq('id', characterId)
    .single()

  if (charErr || !character) {
    return NextResponse.json({ error: 'Character not found' }, { status: 404 })
  }

  // 会話履歴取得（直近30件）
  const { data: msgs } = await admin
    .from('messages')
    .select('sender_role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(30)

  // LLM用の履歴形式に変換
  const history: LLMMessage[] = (msgs ?? []).map(m => ({
    role: m.sender_role === 'user' ? 'user' : 'assistant',
    content: m.content,
  }))

  // LLMで返信生成
  let replyText: string
  try {
    replyText = await generateReply(character, history, userMessage.trim())
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ai-reply] LLM error:', msg)
    return NextResponse.json({ error: 'LLM generation failed', detail: msg }, { status: 502 })
  }

  // 返信をDBに保存
  const now = new Date().toISOString()
  const { data: newMsg, error: insertErr } = await admin
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_role: 'character',
      content: replyText,
      points_used: 0,
      is_read: false,
    })
    .select()
    .single()

  if (insertErr || !newMsg) {
    console.error('[ai-reply] insert error:', insertErr?.message)
    return NextResponse.json({ error: 'Failed to save reply' }, { status: 500 })
  }

  // 会話のlast_message_atを更新（is_unread_staffはfalse = AIが返信済みなのでスタッフ不要）
  await admin
    .from('conversations')
    .update({ last_message_at: now, is_unread_staff: false })
    .eq('id', conversationId)

  // メール通知（非同期・非クリティカル）
  Promise.all([
    admin.auth.admin.getUserById(user.id),
  ]).then(([{ data: authData }]) => {
    const email = authData?.user?.email
    if (email) {
      sendNotificationEmail({
        toEmail: email,
        characterName: character.name,
        messageContent: replyText,
        conversationId,
      })
    }
  }).catch(() => {})

  return NextResponse.json({ message: newMsg })
}
