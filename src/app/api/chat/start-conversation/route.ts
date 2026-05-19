export const dynamic = 'force-dynamic'
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

async function sendWelcomeMessage(admin: ReturnType<typeof adminSupabase>, conversationId: string, characterId: string, userId: string) {
  const { data: char } = await admin
    .from('characters').select('welcome_message').eq('id', characterId).single()
  if (!char?.welcome_message) return null

  const { data: profile } = await admin
    .from('profiles').select('display_name, age, gender').eq('id', userId).single()
  const resolved = resolveVariables(char.welcome_message, profile ?? {})

  const { data: msg } = await admin.from('messages').insert({
    conversation_id: conversationId,
    sender_role: 'character',
    content: resolved,
    points_used: 0,
  }).select().single()

  return msg
}

export async function POST(req: NextRequest) {
  const authClient = createServerClient()
  const user = await getAuthUser(authClient)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { characterId } = await req.json()
  if (!characterId) return NextResponse.json({ error: 'characterId required' }, { status: 400 })

  const admin = adminSupabase()

  // プロフィール行が存在しない場合は作成（DBトリガーが機能していない環境に対応）
  await admin.from('profiles').upsert({
    id: user.id,
    email: user.email ?? '',
    user_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
    role: 'user',
    points: 0,
  }, { onConflict: 'id', ignoreDuplicates: true })

  // 既存会話を確認
  const { data: existing } = await admin
    .from('conversations').select('id')
    .eq('user_id', user.id).eq('character_id', characterId).single()

  if (existing) {
    // メッセージ0件ならウェルカムメッセージを送る
    const { data: existingMsgs } = await admin
      .from('messages').select('id').eq('conversation_id', existing.id).limit(1)

    if (!existingMsgs || existingMsgs.length === 0) {
      const welcomeMessage = await sendWelcomeMessage(admin, existing.id, characterId, user.id)
      return NextResponse.json({ conversationId: existing.id, welcomeMessage })
    }

    return NextResponse.json({ conversationId: existing.id, welcomeMessage: null })
  }

  // 新規会話作成（source='user' = ユーザー起点）
  const { data: newConv, error: convError } = await admin
    .from('conversations')
    .insert({ user_id: user.id, character_id: characterId, source: 'user' })
    .select('id').single()

  if (convError || !newConv) {
    return NextResponse.json({ error: convError?.message ?? 'Failed to create conversation' }, { status: 500 })
  }

  const welcomeMessage = await sendWelcomeMessage(admin, newConv.id, characterId, user.id)

  // ウェルカムメッセージ送信後、このキャラへの自動同報をすべてキャンセル
  // （ログがまだ未作成の場合はスケジューリングフェーズ側で除外される）
  // step_number=1 のみキャンセル。step2 以降はユーザーが返信しない限り送信する
  const { data: step1s } = await admin
    .from('auto_broadcast_steps')
    .select('id, auto_broadcast_sequences!inner(character_id)')
    .eq('auto_broadcast_sequences.character_id', characterId)
    .eq('step_number', 1)
  const step1Ids = (step1s ?? []).map((s: any) => s.id)
  if (step1Ids.length > 0) {
    await admin
      .from('auto_broadcast_logs')
      .update({ status: 'cancelled' })
      .eq('user_id', user.id)
      .in('step_id', step1Ids)
      .eq('status', 'pending')
  }

  return NextResponse.json({ conversationId: newConv.id, welcomeMessage })
}
