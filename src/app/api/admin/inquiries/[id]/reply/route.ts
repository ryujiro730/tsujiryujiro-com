export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/supabase/get-auth-user'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function admin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authClient = createServerClient()
  const user = await getAuthUser(authClient)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin()
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { message } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'メッセージは必須です' }, { status: 400 })

  const { data: inquiry } = await admin()
    .from('inquiries').select('id').eq('id', params.id).single()
  if (!inquiry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await admin().from('inquiry_replies').insert({
    inquiry_id: params.id,
    sender_role: 'staff',
    staff_id: user.id,
    message: message.trim(),
  })

  // 対象inquiryのuser_idを取得して、そのユーザーの全openをansweredに更新
  const { data: targetInquiry } = await admin()
    .from('inquiries').select('user_id').eq('id', params.id).single()

  if (targetInquiry) {
    await admin().from('inquiries')
      .update({ status: 'answered' })
      .eq('user_id', targetInquiry.user_id)
      .eq('status', 'open')
  }

  return NextResponse.json({ ok: true })
}
