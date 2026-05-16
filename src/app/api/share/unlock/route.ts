import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/supabase/get-auth-user'

const SHARE_COOLDOWN_DAYS = 7
const BASE_CHARACTER_LIMIT = 3

export async function GET() {
  const authClient = createServerClient()
  const user = await getAuthUser(authClient)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [
    { count: activatedCount },
    { count: shareCount },
    { data: latestShare },
  ] = await Promise.all([
    adminClient.from('user_characters').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    adminClient.from('share_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    adminClient.from('share_logs').select('created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
  ])

  const limit = BASE_CHARACTER_LIMIT + (shareCount ?? 0)
  const activated = activatedCount ?? 0

  let nextAvailable: string | null = null
  if (latestShare && latestShare.length > 0) {
    const lastDate = new Date(latestShare[0].created_at)
    nextAvailable = new Date(lastDate.getTime() + SHARE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString()
  }

  const canShareNow = !nextAvailable || new Date(nextAvailable) <= new Date()

  return NextResponse.json({ activatedCount: activated, limit, shareCount: shareCount ?? 0, nextAvailable, canShareNow })
}

export async function POST(req: NextRequest) {
  const authClient = createServerClient()
  const user = await getAuthUser(authClient)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tweetUrl } = await req.json()
  if (!tweetUrl) return NextResponse.json({ error: 'tweetUrl required' }, { status: 400 })

  // Validate tweet URL format
  const isValidTweetUrl = /^https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/.test(tweetUrl.trim())
  if (!isValidTweetUrl) {
    return NextResponse.json({ ok: false, error: 'invalid_url', message: '有効なX(Twitter)の投稿URLを入力してください（例: https://x.com/yourname/status/123456）' }, { status: 400 })
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check weekly cooldown
  const since = new Date(Date.now() - SHARE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentShares } = await adminClient
    .from('share_logs')
    .select('created_at')
    .eq('user_id', user.id)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)

  if (recentShares && recentShares.length > 0) {
    const lastDate = new Date(recentShares[0].created_at)
    const nextAvailable = new Date(lastDate.getTime() + SHARE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString()
    return NextResponse.json({ ok: false, error: 'weekly_limit_reached', nextAvailable })
  }

  // Check for duplicate tweet URL
  const { count: dupCount } = await adminClient
    .from('share_logs')
    .select('id', { count: 'exact', head: true })
    .eq('tweet_url', tweetUrl.trim())

  if ((dupCount ?? 0) > 0) {
    return NextResponse.json({ ok: false, error: 'duplicate_tweet', message: 'このURLはすでに使用されています' }, { status: 400 })
  }

  // Insert share log
  const { error } = await adminClient.from('share_logs').insert({
    user_id: user.id,
    tweet_url: tweetUrl.trim(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, message: 'キャラクター枠が1つ解放されました！' })
}
