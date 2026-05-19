export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/supabase/get-auth-user'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  const authClient = createServerClient()
  const user = await getAuthUser(authClient)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conversationId } = await req.json()
  if (!conversationId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 })

  const admin = adminSupabase()

  // この会話がこのユーザーのものか確認
  const { data: conv } = await admin
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .single()

  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await admin
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .eq('sender_role', 'character')
    .eq('is_read', false)

  return NextResponse.json({ ok: true })
}
