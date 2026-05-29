export const dynamic = 'force-dynamic'
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

export async function GET() {
  const user = await assertStaff()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = adminSupabase()
  const { data } = await admin
    .from('search_templates')
    .select('id, name, params, created_at, admin_id')
    .order('created_at', { ascending: false })

  return NextResponse.json({ templates: data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await assertStaff()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, params } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const admin = adminSupabase()
  const { data, error } = await admin
    .from('search_templates')
    .insert({ admin_id: user.id, name: name.trim(), params: params ?? {} })
    .select('id, name, params, created_at, admin_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}
