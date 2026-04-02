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

// シーケンス一覧取得
export async function GET(req: NextRequest) {
  const user = await checkAuth(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const characterId = req.nextUrl.searchParams.get('characterId')
  if (!characterId) return NextResponse.json({ error: 'characterId required' }, { status: 400 })

  const adminClient = createAdminSupabase()
  const { data, error } = await adminClient
    .from('auto_broadcast_sequences')
    .select('*, auto_broadcast_steps(id, step_number, delay_minutes, message, created_at)')
    .eq('character_id', characterId)
    .order('created_at', { ascending: true })
    .order('step_number', { referencedTable: 'auto_broadcast_steps', ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// シーケンス作成
export async function POST(req: NextRequest) {
  const user = await checkAuth(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { characterId, name } = await req.json()
  if (!characterId || !name?.trim()) return NextResponse.json({ error: 'characterId and name required' }, { status: 400 })

  const adminClient = createAdminSupabase()
  const { data, error } = await adminClient
    .from('auto_broadcast_sequences')
    .insert({ character_id: characterId, name: name.trim() })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
