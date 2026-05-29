export const dynamic = 'force-dynamic'
/**
 * GET /api/admin/inquiries/users
 * 問い合わせがあるユーザー一覧を返す（最終アクティビティ降順）
 */

import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/supabase/get-auth-user'

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET() {
  const authClient = createServerClient()
  const user = await getAuthUser(authClient)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await authClient.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = adminSupabase()

  // ユーザーごとに集計
  const { data: inquiries } = await admin
    .from('inquiries')
    .select('id, user_id, subject, message, status, created_at, profiles(id, display_name, email, user_code)')
    .order('created_at', { ascending: false })

  if (!inquiries) return NextResponse.json({ users: [] })

  // 返信情報を取得
  const { data: replies } = await admin
    .from('inquiry_replies')
    .select('inquiry_id, message, created_at, sender_role')
    .order('created_at', { ascending: false })

  const replyMap = new Map<string, { message: string; created_at: string; sender_role: string }>()
  for (const r of (replies ?? [])) {
    if (!replyMap.has(r.inquiry_id)) {
      replyMap.set(r.inquiry_id, r)
    }
  }

  // ユーザー単位でグループ化
  const userMap = new Map<string, {
    userId: string
    displayName: string
    email: string
    userCode: string | null
    openCount: number
    lastActivity: string
    lastPreview: string
  }>()

  for (const inq of inquiries) {
    const p = (inq as any).profiles
    const userId = inq.user_id
    const latestReply = replyMap.get(inq.id)
    const lastActivity = latestReply ? latestReply.created_at : inq.created_at
    const lastPreview = latestReply ? latestReply.message : inq.message

    if (!userMap.has(userId)) {
      userMap.set(userId, {
        userId,
        displayName: p?.display_name ?? '不明',
        email: p?.email ?? '',
        userCode: p?.user_code ?? null,
        openCount: 0,
        lastActivity,
        lastPreview,
      })
    }

    const entry = userMap.get(userId)!
    // statusがopenかつ返信が一件もない場合を「未回答」とカウント（DBのstatus不整合を考慮）
    const hasReply = replyMap.has(inq.id)
    if (inq.status === 'open' && !hasReply) entry.openCount++
    if (lastActivity > entry.lastActivity) {
      entry.lastActivity = lastActivity
      entry.lastPreview = lastPreview
    }
  }

  const users = Array.from(userMap.values())
    .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity))

  return NextResponse.json({ users })
}
