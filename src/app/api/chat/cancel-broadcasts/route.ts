/**
 * POST /api/chat/cancel-broadcasts
 *
 * ユーザーが返信した際に呼ぶ。
 * そのキャラへの pending な auto_broadcast_logs を 'cancelled' にする。
 * fire-and-forget で呼ばれる想定なのでレスポンスは最小限。
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/auto-broadcast'
import { getAuthUser } from '@/lib/supabase/get-auth-user'

export async function POST(req: NextRequest) {
  const authClient = createServerClient()
  const user = await getAuthUser(authClient)
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const { characterId } = await req.json().catch(() => ({}))

  const adminClient = createAdminSupabase()

  if (characterId) {
    // そのキャラのステップIDを取得し、該当ユーザーのログだけキャンセル
    const { data: stepIds } = await adminClient
      .from('auto_broadcast_steps')
      .select('id, auto_broadcast_sequences!inner(character_id)')
      .eq('auto_broadcast_sequences.character_id', characterId)

    const ids = (stepIds ?? []).map((s: any) => s.id)
    if (ids.length > 0) {
      await adminClient
        .from('auto_broadcast_logs')
        .update({ status: 'cancelled' })
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .in('step_id', ids)
    }
  } else {
    // characterId なし → 全キャンセル（フォールバック）
    await adminClient
      .from('auto_broadcast_logs')
      .update({ status: 'cancelled' })
      .eq('user_id', user.id)
      .eq('status', 'pending')
  }

  return NextResponse.json({ ok: true })
}
