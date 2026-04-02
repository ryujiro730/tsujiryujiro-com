import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/supabase/get-auth-user'
import { createAdminSupabase } from '@/lib/auto-broadcast'

async function checkAuth(req: NextRequest) {
  const authClient = createServerClient()
  const user = await getAuthUser(authClient)
  if (!user) return null
  const { data: profile } = await authClient.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'staff'].includes(profile.role)) return null
  return user
}

// ステップ更新
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await checkAuth(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const adminClient = createAdminSupabase()
  const { data, error } = await adminClient
    .from('auto_broadcast_steps')
    .update(body)
    .eq('id', params.id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ステップ削除
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await checkAuth(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createAdminSupabase()
  const { error } = await adminClient
    .from('auto_broadcast_steps')
    .delete().eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
