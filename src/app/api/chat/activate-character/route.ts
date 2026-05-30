export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const BASE_CHARACTER_LIMIT = 3

export async function POST(req: NextRequest) {
  const authClient = createServerClient()
  const { data: { session } } = await authClient.auth.getSession()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const { characterId } = await req.json()
  if (!characterId) return NextResponse.json({ error: 'characterId required' }, { status: 400 })

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 全クエリを並列実行
  const [{ data: profile }, { data: existing }, { count: activatedCount }, { count: shareCount }] = await Promise.all([
    adminClient.from('profiles').select('role').eq('id', userId).single(),
    adminClient.from('user_characters').select('id').eq('user_id', userId).eq('character_id', characterId).single(),
    adminClient.from('user_characters').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    adminClient.from('share_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])

  if (profile?.role === 'admin' || profile?.role === 'staff') {
    if (!existing) {
      await adminClient.from('user_characters').insert({ user_id: userId, character_id: characterId })
    }
    return NextResponse.json({ ok: true, adminBypass: true })
  }

  if (existing) {
    return NextResponse.json({ ok: true, alreadyActivated: true })
  }

  const limit = BASE_CHARACTER_LIMIT + (shareCount ?? 0)
  const activated = activatedCount ?? 0

  if (activated >= limit) {
    return NextResponse.json({ ok: false, error: 'character_limit_reached', limit, activated })
  }

  const { error } = await adminClient.from('user_characters').insert({ user_id: userId, character_id: characterId })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, activated: true, remaining: limit - activated - 1 })
}
