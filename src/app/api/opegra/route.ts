export const dynamic = 'force-dynamic'
/**
 * GET /api/opegra?conversationId=xxx
 * スタッフ用：会話の相手ユーザーへの送信済みフラグ付きで写真一覧を返す
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

export async function GET(req: NextRequest) {
  const authClient = createServerClient()
  const user = await getAuthUser(authClient)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await authClient.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const conversationId = req.nextUrl.searchParams.get('conversationId')
  if (!conversationId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 })

  const admin = adminSupabase()

  // 会話のuser_idとcharacter_idを取得
  const { data: conv } = await admin
    .from('conversations')
    .select('user_id, character_id')
    .eq('id', conversationId)
    .single()
  if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

  // 全アクティブ写真取得
  const { data: photos } = await admin
    .from('opegra_photos')
    .select('*, characters(id, name)')
    .eq('is_active', true)
    .order('sort_order')
    .order('created_at', { ascending: false })

  // このユーザーへの送信済みphoto_idsを取得
  const { data: sentLogs } = await admin
    .from('opegra_sent_log')
    .select('photo_id')
    .eq('user_id', conv.user_id)

  const sentPhotoIds = new Set((sentLogs ?? []).map((l: any) => l.photo_id))

  const result = (photos ?? []).map((p: any) => ({
    ...p,
    already_sent: sentPhotoIds.has(p.id),
  }))

  return NextResponse.json({
    photos: result,
    characterId: conv.character_id,
    userId: conv.user_id,
  })
}
