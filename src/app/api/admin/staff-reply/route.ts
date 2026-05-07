/**
 * スタッフ返信API
 * POST /api/admin/staff-reply
 *
 * 人間スタッフがキャラクターとして返信するときに呼ぶ。
 * メッセージをDBに保存し、学習データ（training_data）も更新する。
 * AIが返信した会話は学習データに含めない。
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
  // staff/adminのみ許可
  const authClient = createServerClient()
  const user = await getAuthUser(authClient)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: staffProfile } = await authClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!staffProfile || !['admin', 'staff'].includes(staffProfile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { conversationId: string; content: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { conversationId, content } = body
  if (!conversationId || !content?.trim()) {
    return NextResponse.json({ error: 'conversationId and content are required' }, { status: 400 })
  }

  const admin = adminSupabase()

  // 変数置換のためユーザープロフィールを取得
  const { data: conv } = await admin
    .from('conversations').select('user_id').eq('id', conversationId).single()
  let resolvedContent = content.trim()
  if (conv?.user_id) {
    const { data: userProfile } = await admin
      .from('profiles').select('display_name, age, gender').eq('id', conv.user_id).single()
    if (userProfile) resolvedContent = resolveVariables(resolvedContent, userProfile)
  }

  // メッセージをDBに保存
  const { data: msg, error: insertErr } = await admin
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_role: 'character',
      content: resolvedContent,
      points_used: 0,
      is_read: false,
    })
    .select()
    .single()

  if (insertErr || !msg) {
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
  }

  const now = new Date().toISOString()

  // 会話のlast_message_atを更新
  await admin
    .from('conversations')
    .update({ last_message_at: now, is_unread_staff: false })
    .eq('id', conversationId)

  // ユーザーメッセージを既読にする
  await admin
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .eq('sender_role', 'user')
    .eq('is_read', false)

  // 学習データを保存（人間スタッフ返信のみ）
  try {
    const { data: conv } = await admin
      .from('conversations')
      .select('user_id, character_id')
      .eq('id', conversationId)
      .single()

    if (conv) {
      // 会話の全メッセージを取得
      const { data: allMsgs } = await admin
        .from('messages')
        .select('sender_role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      const trainingMessages = (allMsgs ?? []).map(m => ({
        role: m.sender_role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }))

      // キャラクター情報でsystem_promptを構築
      const { data: char } = await admin
        .from('characters')
        .select('name, age, description, personality, system_prompt')
        .eq('id', conv.character_id)
        .single()

      const systemPrompt = char
        ? [
            `あなたは「${char.name}」というキャラクターです。`,
            char.age ? `年齢: ${char.age}歳` : '',
            `プロフィール: ${char.description}`,
            `性格: ${char.personality}`,
            char.system_prompt?.trim() ?? '',
          ].filter(Boolean).join('\n')
        : null

      await admin.from('training_data').upsert({
        conversation_id: conversationId,
        character_id: conv.character_id,
        user_id: conv.user_id,
        system_prompt: systemPrompt,
        messages: trainingMessages,
        message_count: trainingMessages.length,
        updated_at: now,
      }, { onConflict: 'conversation_id' })
    }
  } catch (err) {
    // 学習データ保存は非クリティカル
    console.error('[staff-reply] training_data save error:', err instanceof Error ? err.message : err)
  }

  return NextResponse.json({ message: msg })
}
