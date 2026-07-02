export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'


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

  const { data: existing } = await adminClient
    .from('user_characters').select('id').eq('user_id', userId).eq('character_id', characterId).single()

  if (existing) return NextResponse.json({ ok: true, alreadyActivated: true })

  const { error } = await adminClient.from('user_characters').insert({ user_id: userId, character_id: characterId })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, activated: true })
}
