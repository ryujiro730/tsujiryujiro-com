export const dynamic = 'force-dynamic'
/**
 * GET /api/cron/bulk-send
 * 予約済み一括送信を処理するcronジョブ（1分ごとに実行）
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { resolveVariables } from '@/lib/message-variables'

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = adminSupabase()
  const now = new Date().toISOString()

  // 送信すべき予約を取得
  const { data: candidates } = await admin
    .from('bulk_send_schedules')
    .select('id, conversation_ids, message')
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .limit(10)  // 1回のcronで最大10件処理

  if (!candidates?.length) {
    return NextResponse.json({ processed: 0 })
  }

  // 楽観的ロック: pending → processing に更新できたものだけ処理（競合状態防止）
  const schedules: typeof candidates = []
  for (const candidate of candidates) {
    const { error: lockErr } = await admin
      .from('bulk_send_schedules')
      .update({ status: 'processing' })
      .eq('id', candidate.id)
      .eq('status', 'pending')
    if (!lockErr) schedules.push(candidate)
  }

  if (!schedules.length) {
    return NextResponse.json({ processed: 0 })
  }

  let totalSent = 0

  for (const schedule of schedules) {
    const conversationIds: string[] = schedule.conversation_ids as string[]
    if (!conversationIds.length) {
      await admin.from('bulk_send_schedules')
        .update({ status: 'sent', sent_at: now, sent_count: 0 })
        .eq('id', schedule.id)
      continue
    }

    const { data: conversations } = await admin
      .from('conversations')
      .select('id, user_id')
      .in('id', conversationIds)

    if (!conversations?.length) {
      await admin.from('bulk_send_schedules')
        .update({ status: 'sent', sent_at: now, sent_count: 0 })
        .eq('id', schedule.id)
      continue
    }

    const userIds = Array.from(new Set(conversations.map(c => c.user_id)))
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, display_name, age, gender')
      .in('id', userIds)

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

    const messages = conversations.map(conv => {
      const profile = profileMap.get(conv.user_id)
      return {
        conversation_id: conv.id,
        sender_role: 'character',
        content: resolveVariables(schedule.message, profile ?? {}),
        points_used: 0,
        is_read: false,
      }
    })

    const { error: insertErr } = await admin.from('messages').insert(messages)
    if (insertErr) {
      console.error('[bulk-send cron] insert error:', insertErr.message)
      await admin.from('bulk_send_schedules')
        .update({ status: 'failed', sent_at: now, sent_count: 0 })
        .eq('id', schedule.id)
      continue
    }

    await admin
      .from('conversations')
      .update({ last_message_at: now, is_unread_staff: false })
      .in('id', conversationIds)

    await admin
      .from('bulk_send_schedules')
      .update({ status: 'sent', sent_at: now, sent_count: conversations.length })
      .eq('id', schedule.id)

    totalSent += conversations.length
  }

  return NextResponse.json({ processed: schedules.length, sent: totalSent })
}
