import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/supabase/get-auth-user'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function admin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const authClient = createServerClient()
  const user = await getAuthUser(authClient)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: inquiry } = await admin()
    .from('inquiries')
    .select('id, subject, message, status, created_at')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!inquiry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: replies } = await admin()
    .from('inquiry_replies')
    .select('id, sender_role, message, created_at')
    .eq('inquiry_id', params.id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ inquiry, replies: replies ?? [] })
}
