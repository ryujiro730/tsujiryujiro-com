export const dynamic = 'force-dynamic'
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

// ステップ追加
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await checkAuth(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { delay_minutes, message, image_url } = await req.json()
  if (delay_minutes == null || !message?.trim())
    return NextResponse.json({ error: 'delay_minutes and message required' }, { status: 400 })

  const adminClient = createAdminSupabase()

  // 次の step_number を取得
  const { data: existing } = await adminClient
    .from('auto_broadcast_steps')
    .select('step_number')
    .eq('sequence_id', params.id)
    .order('step_number', { ascending: false })
    .limit(1)

  const nextStep = existing && existing.length > 0 ? existing[0].step_number + 1 : 1

  const { data, error } = await adminClient
    .from('auto_broadcast_steps')
    .insert({ sequence_id: params.id, step_number: nextStep, delay_minutes, message: message.trim(), image_url: image_url ?? null })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
