export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// GET /api/videos - アクティブな動画一覧 + 購入済みID一覧
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: videos }, { data: purchases }] = await Promise.all([
    adminDb
      .from('video_items')
      .select('id, character_id, title, description, price_points, thumbnail_url, is_active, sort_order, character:characters(name, avatar_url)')
      .eq('is_active', true)
      .order('sort_order')
      .order('created_at'),
    adminDb
      .from('video_item_purchases')
      .select('video_item_id')
      .eq('user_id', user.id),
  ])

  const purchasedIds = (purchases ?? []).map((p: { video_item_id: string }) => p.video_item_id)

  // 購入済みの動画にはvideo_urlを含める
  let videosWithUrl: unknown[] = []
  if (purchasedIds.length > 0) {
    const { data: purchasedVideos } = await adminDb
      .from('video_items')
      .select('id, video_url')
      .in('id', purchasedIds)
    const urlMap = new Map((purchasedVideos ?? []).map((v: { id: string; video_url: string }) => [v.id, v.video_url]))
    videosWithUrl = (videos ?? []).map((v: Record<string, unknown>) => ({
      ...v,
      video_url: urlMap.get(v.id as string) ?? null,
    }))
  } else {
    videosWithUrl = videos ?? []
  }

  return NextResponse.json({ videos: videosWithUrl, purchasedIds })
}
