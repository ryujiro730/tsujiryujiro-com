export const dynamic = 'force-dynamic'
/**
 * GET  /api/admin/bulk-send/schedule  - 予約一覧
 * POST /api/admin/bulk-send/schedule  - 予約作成
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

async function assertStaff() {
  const authClient = createServerClient()
  const user = await getAuthUser(authClient)
  if (!user) return null
  const { data } = await authClient.from('profiles').select('role').eq('id', user.id).single()
  if (!data || !['admin', 'staff'].includes(data.role)) return null
  return user
}

export async function GET() {
  const user = await assertStaff()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = adminSupabase()
  const { data } = await admin
    .from('bulk_send_schedules')
    .select('id, message, scheduled_at, status, sent_count, conversation_ids, created_at, profiles(display_name)')
    .order('scheduled_at', { ascending: true })
    .limit(50)

  return NextResponse.json({ schedules: data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await assertStaff()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { conversationIds, message, scheduledAt } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })
  if (!Array.isArray(conversationIds) || conversationIds.length === 0) {
    return NextResponse.json({ error: 'conversationIds required' }, { status: 400 })
  }
  if (!scheduledAt) return NextResponse.json({ error: 'scheduledAt required' }, { status: 400 })
  if (new Date(scheduledAt) <= new Date()) {
    return NextResponse.json({ error: '予約日時は現在より後にしてください' }, { status: 400 })
  }
  if (conversationIds.length > 200) {
    return NextResponse.json({ error: '一度に送信できるのは200件までです' }, { status: 400 })
  }

  const admin = adminSupabase()
  const { data, error } = await admin
    .from('bulk_send_schedules')
    .insert({
      admin_id: user.id,
      conversation_ids: conversationIds,
      message: message.trim(),
      scheduled_at: scheduledAt,
    })
    .select('id, message, scheduled_at, status, conversation_ids, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ schedule: data })
}
