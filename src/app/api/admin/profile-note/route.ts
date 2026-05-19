export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/supabase/get-auth-user'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  // 呼び出し元がadmin/staffか確認
  const supabase = createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, note } = await request.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ admin_note: note })
    .eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function GET(request: Request) {
  // 呼び出し元がadmin/staffか確認
  const supabase = createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('admin_note')
    .eq('id', userId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ admin_note: data?.admin_note ?? '' })
}
