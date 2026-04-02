import { createClient, SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminSupabase = SupabaseClient<any, any, any>

export function createAdminSupabase(): AdminSupabase {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function processAutoBroadcast(): Promise<{ scheduled: number; sent: number; failed: number }> {
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
      .select('id, created_at')
      .not('role', 'in', '(admin,staff)')

    if (users && users.length > 0) {
      for (const step of activeSteps) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const seq = (step as any).auto_broadcast_sequences
        // シーケンス作成後に登録したユーザーのみ対象
        const eligibleUsers = users.filter(u => u.created_at >= seq.created_at)

        const inserts = eligibleUsers.map(user => ({
          user_id: user.id,
          step_id: step.id,
          scheduled_at: new Date(new Date(user.created_at).getTime() + step.delay_minutes * 60 * 1000).toISOString(),
          status: 'pending',
        }))

        if (inserts.length === 0) continue

        // ON CONFLICT DO NOTHING で重複スキップ
        const { error } = await adminClient
          .from('auto_broadcast_logs')
          .upsert(inserts, { onConflict: 'user_id,step_id', ignoreDuplicates: true })

        if (!error) scheduled += inserts.length
      }
    }
  }

  // pending かつ scheduled_at <= now() のログを送信
  const now = new Date().toISOString()
  const { data: pendingLogs } = await adminClient
    .from('auto_broadcast_logs')
    .select(`
      id, user_id,
      auto_broadcast_steps!inner(
        message,
        auto_broadcast_sequences!inner(character_id)
      )
    `)
    .eq('status', 'pending')
    .lte('scheduled_at', now)

  let sent = 0
  let failed = 0

  if (pendingLogs) {
    for (const log of pendingLogs) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const step = (log as any).auto_broadcast_steps
        const characterId = step.auto_broadcast_sequences.character_id
        const message = step.message
        const msgTime = new Date().toISOString()

        const { data: existingConv } = await adminClient
          .from('conversations').select('id')
          .eq('user_id', log.user_id).eq('character_id', characterId).single()

        let conversationId: string

        if (existingConv) {
          conversationId = existingConv.id
        } else {
          const { data: newConv, error: convError } = await adminClient
            .from('conversations')
            .insert({ user_id: log.user_id, character_id: characterId, last_message_at: msgTime, is_unread_staff: false })
            .select('id').single()
          if (convError || !newConv) throw new Error('conv create failed: ' + convError?.message)
          conversationId = newConv.id
        }

        const { error: msgError } = await adminClient.from('messages').insert({
          conversation_id: conversationId,
          sender_role: 'character',
          content: message,
          points_used: 0,
          is_read: false,
        })
        if (msgError) throw new Error('msg insert failed: ' + msgError.message)

        await adminClient.from('conversations')
          .update({ last_message_at: msgTime, is_unread_staff: false }).eq('id', conversationId)

        await adminClient.from('auto_broadcast_logs')
          .update({ status: 'sent', sent_at: msgTime, conversation_id: conversationId })
          .eq('id', log.id)

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
  }

  return { scheduled, sent, failed }
}
