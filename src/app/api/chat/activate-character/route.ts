import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/supabase/get-auth-user'

// キャンペーン期間中: 3キャラ無料
const BASE_CHARACTER_LIMIT = 3

export async function POST(req: NextRequest) {
  const authClient = createServerClient()
  const user = await getAuthUser(authClient)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { characterId } = await req.json()
  if (!characterId) return NextResponse.json({ error: 'characterId required' }, { status: 400 })

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Already activated?
  const { data: existing } = await adminClient
    .from('user_characters')
    .select('id')
    .eq('user_id', user.id)
    .eq('character_id', characterId)
    .single()

  if (existing) {
    return NextResponse.json({ ok: true, alreadyActivated: true })
  }

  // Count activated characters and share bonuses in parallel
  const [{ count: activatedCount }, { count: shareCount }] = await Promise.all([
    adminClient.from('user_characters').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    adminClient.from('share_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  const limit = BASE_CHARACTER_LIMIT + (shareCount ?? 0)
  const activated = activatedCount ?? 0

  if (activated >= limit) {
    return NextResponse.json({ ok: false, error: 'character_limit_reached', limit, activated })
  }

  // Activate character
  const { error } = await adminClient.from('user_characters').insert({
    user_id: user.id,
    character_id: characterId,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, activated: true, remaining: limit - activated - 1 })
}
