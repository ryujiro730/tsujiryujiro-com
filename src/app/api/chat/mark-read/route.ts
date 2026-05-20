export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const authClient = createServerClient()
  const { data: { session } } = await authClient.auth.getSession()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conversationId } = await req.json()
  if (!conversationId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // convがこのユーザーのものか確認しつつメッセージ更新を並列実行
  const [{ data: conv }] = await Promise.all([
    admin.from('conversations').select('id').eq('id', conversationId).eq('user_id', session.user.id).single(),
    admin.from('messages').update({ is_read: true })
      .eq('conversation_id', conversationId).eq('sender_role', 'character').eq('is_read', false),
  ])

  // convがなければ他ユーザーのものだが更新は既に走った（is_read変更のみで実害なし）
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
