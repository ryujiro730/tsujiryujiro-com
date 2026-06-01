export const dynamic = 'force-dynamic'
/**
 * GET /api/admin/conversation-detail/[id]
 * 会話詳細ページに必要な全データを1リクエストで返す（高速化のため）
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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authClient = createServerClient()
  const user = await getAuthUser(authClient)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callerProfile } = await authClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!callerProfile || !['admin', 'staff'].includes(callerProfile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = adminSupabase()
  const { id } = params

  // 全クエリを並列実行
  const [convRes, msgsRes, labelsRes] = await Promise.all([
    admin
      .from('conversations')
      .select('id, staff_note, characters(*), profiles(*)')
      .eq('id', id)
      .single(),
    admin
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true }),
    admin
      .from('admin_labels')
      .select('*')
      .order('name'),
  ])

  if (convRes.error || !convRes.data) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const conv = convRes.data as any
  const charId = conv.characters?.id
  const userId = conv.profiles?.id

  // キャラ・ユーザー依存のクエリを並列実行
  const [tmplRes, assignRes, profileNoteRes] = await Promise.all([
    charId
      ? admin.from('reply_templates').select('id, title, content, sort_order').eq('character_id', charId).order('sort_order').order('created_at')
      : Promise.resolve({ data: [] }),
    userId
      ? admin.from('user_label_assignments').select('label_id').eq('user_id', userId)
      : Promise.resolve({ data: [] }),
    userId
      ? admin.from('profiles').select('admin_note').eq('id', userId).single()
      : Promise.resolve({ data: null }),
  ])

  return NextResponse.json({
    conversation: conv,
    messages: msgsRes.data ?? [],
    labels: labelsRes.data ?? [],
    templates: (tmplRes as any).data ?? [],
    assignedLabelIds: ((assignRes as any).data ?? []).map((a: any) => a.label_id),
    adminNote: (profileNoteRes as any).data?.admin_note ?? '',
  })
}
