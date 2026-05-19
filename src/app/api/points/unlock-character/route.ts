export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/supabase/get-auth-user'

const UNLOCK_COST = 3000

export async function POST() {
  const authClient = createServerClient()
  const user = await getAuthUser(authClient)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile } = await adminClient
    .from('profiles')
    .select('points')
    .eq('id', user.id)
    .single()

  if (!profile || profile.points < UNLOCK_COST) {
    return NextResponse.json({ ok: false, error: 'insufficient_points', message: `ポイントが不足しています（必要: ${UNLOCK_COST}pt）` }, { status: 400 })
  }

  // ポイント消費 & share_logsに追加（キャラ枠拡張）
  const [{ error: pointsError }, { error: logError }] = await Promise.all([
    adminClient.from('profiles').update({ points: profile.points - UNLOCK_COST }).eq('id', user.id),
    adminClient.from('share_logs').insert({ user_id: user.id, tweet_url: `points:unlock:${Date.now()}` }),
  ])

  if (pointsError || logError) {
    return NextResponse.json({ error: pointsError?.message ?? logError?.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: 'キャラクター枠が1つ解放されました！', remainingPoints: profile.points - UNLOCK_COST })
}
