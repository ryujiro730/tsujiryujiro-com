import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { resolveVariables } from './message-variables'
import { sendNotificationEmail } from './send-notification-email'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminSupabase = SupabaseClient<any, any, any>

export function createAdminSupabase(): AdminSupabase {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function processAutoBroadcast(): Promise<{ scheduled: number; sent: number; skipped: number; cancelled: number; failed: number }> {
  const adminClient = createAdminSupabase()
  let scheduled = 0

  // アクティブなシーケンスのステップを取得
  const { data: activeSteps } = await adminClient
    .from('auto_broadcast_steps')
    .select('id, delay_minutes, sequence_id, auto_broadcast_sequences!inner(id, character_id, is_active, created_at)')
    .eq('auto_broadcast_sequences.is_active', true)

  if (activeSteps && activeSteps.length > 0) {
    // 一般ユーザー全員を取得
    const { data: users } = await adminClient
      .from('profiles')
      .select('id, created_at, display_name, age, gender')
      .not('role', 'in', '(admin,staff)')

    if (users && users.length > 0) {
      for (const step of activeSteps) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const seq = (step as any).auto_broadcast_sequences
        const seqCreatedAt = new Date(seq.created_at).getTime()

        // 全ユーザー対象。ユーザー登録がシーケンス作成より前の場合は
        // シーケンス作成時点を起算にする（既存ユーザーも漏れなく受信できる）
        const inserts = users.map(user => {
          const baseTime = Math.max(new Date(user.created_at).getTime(), seqCreatedAt)
          return {
            user_id: user.id,
            step_id: step.id,
            scheduled_at: new Date(baseTime + step.delay_minutes * 60 * 1000).toISOString(),
            status: 'pending',
          }
        })

        // ON CONFLICT DO NOTHING で重複スキップ
        const { error } = await adminClient
          .from('auto_broadcast_logs')
          .upsert(inserts, { onConflict: 'user_id,step_id', ignoreDuplicates: true })

        if (!error) scheduled += inserts.length
      }
    }
  }

  // pending → processing にアトミック更新（同時実行で同じログを二重送信しない）
  const now = new Date().toISOString()
  const { data: pendingLogs } = await adminClient
    .from('auto_broadcast_logs')
    .update({ status: 'processing' })
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .select(`
      id, user_id,
      auto_broadcast_steps!inner(
        message, image_url, step_number,
        auto_broadcast_sequences!inner(character_id)
      )
    `)

  let sent = 0
  let skipped = 0
  let cancelled = 0
  let failed = 0

  if (!pendingLogs || pendingLogs.length === 0) {
    return { scheduled, sent, skipped, cancelled, failed }
  }

  // ── バッチ判定：pending なユーザーの会話・メッセージをまとめて取得 ──────────
  const pendingUserIds = Array.from(new Set(pendingLogs.map(l => l.user_id)))

  // 該当ユーザーの全会話
  const { data: conversations } = await adminClient
    .from('conversations')
    .select('id, user_id, character_id')
    .in('user_id', pendingUserIds)

  const convIds = (conversations ?? []).map(c => c.id)

  // 全会話のメッセージ（sender_role だけ取得）
  const { data: allMessages } = convIds.length > 0
    ? await adminClient
        .from('messages')
        .select('conversation_id, sender_role')
        .in('conversation_id', convIds)
    : { data: [] as { conversation_id: string; sender_role: string }[] }

  // ルックアップマップを構築
  // userRepliedToChar: `${userId}:${characterId}` → そのキャラに返信済み
  const userRepliedToChar = new Set<string>()

  for (const msg of allMessages ?? []) {
    const conv = (conversations ?? []).find(c => c.id === msg.conversation_id)
    if (!conv) continue
    if (msg.sender_role === 'user') {
      userRepliedToChar.add(`${conv.user_id}:${conv.character_id}`)
    }
  }

  // ユーザー起点の会話（ウェルカム送信済み = source='user'）を取得
  // → step1 はスキップするが step2 以降は送信する
  const { data: userInitConvs } = await adminClient
    .from('conversations')
    .select('user_id, character_id')
    .eq('source', 'user')
    .in('user_id', pendingUserIds)

  const userInitiatedKeys = new Set(
    (userInitConvs ?? []).map(c => `${c.user_id}:${c.character_id}`)
  )
  // ──────────────────────────────────────────────────────────────────────────

  for (const log of pendingLogs) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const step = (log as any).auto_broadcast_steps
      const characterId: string = step.auto_broadcast_sequences.character_id
      const stepNumber: number = step.step_number

      // ① ユーザーがこのキャラに返信済み → 全ステップキャンセル
      if (userRepliedToChar.has(`${log.user_id}:${characterId}`)) {
        await adminClient.from('auto_broadcast_logs')
          .update({ status: 'cancelled' }).eq('id', log.id)
        cancelled++
        continue
      }

      // ② ウェルカムメッセージ送信済み（source='user'）かつ step1 → スキップ
      //    step2 以降はウェルカムの「フォロー」として送信する
      if (stepNumber === 1 && userInitiatedKeys.has(`${log.user_id}:${characterId}`)) {
        await adminClient.from('auto_broadcast_logs')
          .update({ status: 'skipped' }).eq('id', log.id)
        skipped++
        continue
      }

      // ③ 通常送信
      const msgTime = new Date().toISOString()

      const { data: userProfile } = await adminClient
        .from('profiles').select('display_name, age, gender').eq('id', log.user_id).single()
      const message = resolveVariables(step.message, userProfile ?? {})

      const existingConv = (conversations ?? []).find(
        c => c.user_id === log.user_id && c.character_id === characterId
      )

      let conversationId: string

      if (existingConv) {
        conversationId = existingConv.id
      } else {
        const { data: newConv, error: convError } = await adminClient
          .from('conversations')
          .insert({ user_id: log.user_id, character_id: characterId, last_message_at: msgTime, is_unread_staff: false, source: 'auto_broadcast' })
          .select('id').single()
        if (convError || !newConv) throw new Error('conv create failed: ' + convError?.message)
        conversationId = newConv.id
        // 同バッチ内の後続ステップが同じ会話を再利用できるようにキャッシュに追加
        ;(conversations as { id: string; user_id: string; character_id: string }[]).push({
          id: conversationId,
          user_id: log.user_id,
          character_id: characterId,
        })
      }

      const imageUrl: string | null = step.image_url ?? null
      const { error: msgError } = await adminClient.from('messages').insert({
        conversation_id: conversationId,
        sender_role: 'character',
        content: message,
        points_used: 0,
        is_read: false,
        metadata: imageUrl ? { image_url: imageUrl } : null,
      })
      if (msgError) throw new Error('msg insert failed: ' + msgError.message)

      await adminClient.from('conversations')
        .update({ last_message_at: msgTime, is_unread_staff: false }).eq('id', conversationId)

      await adminClient.from('auto_broadcast_logs')
        .update({ status: 'sent', sent_at: msgTime, conversation_id: conversationId })
        .eq('id', log.id)

      // メール通知（非クリティカル）
      Promise.all([
        adminClient.from('characters').select('name').eq('id', characterId).single(),
        adminClient.auth.admin.getUserById(log.user_id),
      ]).then(([{ data: charData }, { data: authData }]) => {
        const toEmail = authData?.user?.email
        if (toEmail && charData?.name) {
          sendNotificationEmail({
            toEmail,
            characterName: charData.name,
            messageContent: message,
            conversationId,
          })
        }
      }).catch(() => {/* 無視 */})

      sent++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await adminClient.from('auto_broadcast_logs')
        .update({ status: 'failed', error_message: msg })
        .eq('id', log.id)
      failed++
      console.error('auto broadcast send error:', msg)
    }
  }

  return { scheduled, sent, skipped, cancelled, failed }
}
