export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { resolveVariables } from '@/lib/message-variables'

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function sendWelcomeMessage(admin: ReturnType<typeof adminSupabase>, conversationId: string, characterId: string, userId: string) {
  // キャラとプロフィールを並列取得
  const [{ data: char }, { data: profile }] = await Promise.all([
    admin.from('characters').select('welcome_message').eq('id', characterId).single(),
    admin.from('profiles').select('display_name, age, gender').eq('id', userId).single(),
  ])
  if (!char?.welcome_message) return null

  const resolved = resolveVariables(char.welcome_message, profile ?? {})
  const { data: msg } = await admin.from('messages').insert({
    conversation_id: conversationId,
    sender_role: 'character',
    content: resolved,
    points_used: 0,
  }).select().single()

  return msg
}

async function cancelStep1Broadcasts(admin: ReturnType<typeof adminSupabase>, userId: string, characterId: string) {
  const { data: step1s } = await admin
    .from('auto_broadcast_steps')
    .select('id, auto_broadcast_sequences!inner(character_id)')
    .eq('auto_broadcast_sequences.character_id', characterId)
    .eq('step_number', 1)
  const step1Ids = (step1s ?? []).map((s: any) => s.id)
  if (step1Ids.length > 0) {
    await admin.from('auto_broadcast_logs')
      .update({ status: 'cancelled' })
      .eq('user_id', userId)
      .in('step_id', step1Ids)
      .eq('status', 'pending')
  }
}

export async function POST(req: NextRequest) {
  const authClient = createServerClient()
  const { data: { session } } = await authClient.auth.getSession()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user

  const { characterId } = await req.json()
  if (!characterId) return NextResponse.json({ error: 'characterId required' }, { status: 400 })

  const admin = adminSupabase()

  // プロフィールupsertと既存会話チェックを並列実行
  const [, { data: existing }] = await Promise.all([
    admin.from('profiles').upsert({
      id: user.id,
      email: user.email ?? '',
      user_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
      role: 'user',
      points: 0,
    }, { onConflict: 'id', ignoreDuplicates: true }),
    admin.from('conversations').select('id')
      .eq('user_id', user.id).eq('character_id', characterId).single(),
  ])

  if (existing) {
    const { data: existingMsgs } = await admin
      .from('messages').select('id').eq('conversation_id', existing.id).limit(1)

    if (!existingMsgs || existingMsgs.length === 0) {
      const welcomeMessage = await sendWelcomeMessage(admin, existing.id, characterId, user.id)
      return NextResponse.json({ conversationId: existing.id, welcomeMessage })
    }

    return NextResponse.json({ conversationId: existing.id, welcomeMessage: null })
  }

  // 新規会話作成
  const { data: newConv, error: convError } = await admin
    .from('conversations')
    .insert({ user_id: user.id, character_id: characterId, source: 'user' })
    .select('id').single()

  if (convError || !newConv) {
    return NextResponse.json({ error: convError?.message ?? 'Failed to create conversation' }, { status: 500 })
  }

  const welcomeMessage = await sendWelcomeMessage(admin, newConv.id, characterId, user.id)

  // ブロードキャストキャンセルはfire-and-forget（レスポンスをブロックしない）
  cancelStep1Broadcasts(admin, user.id, characterId).catch(() => {})

  return NextResponse.json({ conversationId: newConv.id, welcomeMessage })
}
