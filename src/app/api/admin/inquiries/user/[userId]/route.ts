export const dynamic = 'force-dynamic'
/**
 * GET  /api/admin/inquiries/user/[userId]
 *   → そのユーザーの全問い合わせ＋返信をチャット形式でフラットに返す
 *
 * POST /api/admin/inquiries/user/[userId]
 *   → スタッフ返信を送る（最新のinquiryに紐付け）
 *   body: { message: string }
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

export async function GET(_req: NextRequest, { params }: { params: { userId: string } }) {
  const user = await assertStaff()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = adminSupabase()
  const { userId } = params

  // ユーザープロフィール
  const { data: profile } = await admin
    .from('profiles')
    .select('id, display_name, email, user_code, points')
    .eq('id', userId)
    .single()

  // そのユーザーの全問い合わせ
  const { data: inquiries } = await admin
    .from('inquiries')
    .select('id, subject, message, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (!inquiries?.length) {
    return NextResponse.json({ profile, messages: [] })
  }

  const inquiryIds = inquiries.map(i => i.id)

  // 全返信
  const { data: replies } = await admin
    .from('inquiry_replies')
    .select('id, inquiry_id, message, sender_role, created_at, profiles(display_name)')
    .in('inquiry_id', inquiryIds)
    .order('created_at', { ascending: true })

  // チャット形式にフラット化
  type ChatMsg = {
    id: string
    role: 'user' | 'staff'
    message: string
    subject?: string          // inquiryの件名（ユーザー発信のみ）
    inquiryId: string
    inquiryStatus?: string    // inquiryの1件目メッセージの場合のみ
    created_at: string
    senderName?: string
  }

  const messages: ChatMsg[] = []

  for (const inq of inquiries) {
    // inquiry本文 → ユーザー発言
    messages.push({
      id: `inq-${inq.id}`,
      role: 'user',
      message: inq.message,
      subject: inq.subject,
      inquiryId: inq.id,
      inquiryStatus: inq.status,
      created_at: inq.created_at,
    })
    // その問い合わせへの返信
    for (const r of (replies ?? []).filter(r => r.inquiry_id === inq.id)) {
      messages.push({
        id: r.id,
        role: r.sender_role === 'staff' ? 'staff' : 'user',
        message: r.message,
        inquiryId: inq.id,
        created_at: r.created_at,
        senderName: (r as any).profiles?.display_name,
      })
    }
  }

  // 時刻順に再ソート
  messages.sort((a, b) => a.created_at.localeCompare(b.created_at))

  // 最新のinquiryのstatusを返す（返信先として使う）
  const latestInquiry = [...inquiries].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]

  return NextResponse.json({ profile, messages, latestInquiryId: latestInquiry.id, latestStatus: latestInquiry.status })
}

export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  const staffUser = await assertStaff()
  if (!staffUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = adminSupabase()
  const { userId } = params
  const { message, inquiryId } = await req.json()

  if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })

  // 対象inquiryを特定（指定がなければそのユーザーの最新inquiry）
  let targetInquiryId = inquiryId
  if (!targetInquiryId) {
    const { data: latest } = await admin
      .from('inquiries')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (!latest) return NextResponse.json({ error: 'No inquiry found for user' }, { status: 404 })
    targetInquiryId = latest.id
  }

  // 返信を保存
  const { data: reply, error } = await admin
    .from('inquiry_replies')
    .insert({
      inquiry_id: targetInquiryId,
      sender_role: 'staff',
      staff_id: staffUser.id,
      message: message.trim(),
    })
    .select('id, inquiry_id, message, sender_role, created_at')
    .single()

  if (error || !reply) return NextResponse.json({ error: error?.message ?? 'Failed' }, { status: 500 })

  // inquiryをansweredに更新
  await admin.from('inquiries').update({ status: 'answered' }).eq('id', targetInquiryId)

  return NextResponse.json({ reply })
}
