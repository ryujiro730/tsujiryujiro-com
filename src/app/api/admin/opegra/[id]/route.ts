export const dynamic = 'force-dynamic'
/**
 * DELETE /api/admin/opegra/[id] - 写真削除
 * PATCH  /api/admin/opegra/[id] - 写真更新（タイトル・sort_order・is_active）
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

async function assertAdmin() {
  const authClient = createServerClient()
  const user = await getAuthUser(authClient)
  if (!user) return null
  const { data } = await authClient.from('profiles').select('role').eq('id', user.id).single()
  if (!data || data.role !== 'admin') return null
  return user
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = adminSupabase()
  const { error } = await admin.from('opegra_photos').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const admin = adminSupabase()
  const { data, error } = await admin
    .from('opegra_photos')
    .update(body)
    .eq('id', params.id)
    .select('*, characters(id, name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ photo: data })
}
