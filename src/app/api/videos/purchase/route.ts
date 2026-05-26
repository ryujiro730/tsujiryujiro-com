export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/videos/purchase - 動画購入（ポイント消費）
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { videoItemId } = await req.json()
  if (!videoItemId) return NextResponse.json({ error: 'videoItemId required' }, { status: 400 })

  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 動画情報取得
  const { data: video } = await adminDb
    .from('video_items')
    .select('*')
    .eq('id', videoItemId)
    .eq('is_active', true)
    .single()
  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 })

  // 既に購入済みか確認
  const { data: existing } = await adminDb
    .from('video_item_purchases')
    .select('id')
    .eq('user_id', user.id)
    .eq('video_item_id', videoItemId)
    .single()
  if (existing) return NextResponse.json({ error: 'already_purchased' }, { status: 409 })

  // ユーザーのポイント確認
  const { data: profile } = await adminDb
    .from('profiles')
    .select('points, bonus_points, bonus_points_expires_at')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const now = new Date()
  const bonusAvailable =
    profile.bonus_points_expires_at && new Date(profile.bonus_points_expires_at) > now
      ? (profile.bonus_points ?? 0)
      : 0
  const totalPoints = profile.points + bonusAvailable
  if (totalPoints < video.price_points) {
    return NextResponse.json(
      { error: 'insufficient_points', current: totalPoints, required: video.price_points },
      { status: 402 }
    )
  }

  // ボーナスptから先に消費
  const bonusDeduct = Math.min(bonusAvailable, video.price_points)
  const regularDeduct = video.price_points - bonusDeduct
  const newBonusPoints = bonusAvailable - bonusDeduct
  const newPoints = profile.points - regularDeduct
  const updatePayload: Record<string, number> = { points: newPoints }
  if (bonusDeduct > 0) updatePayload.bonus_points = newBonusPoints

  // ポイント更新
  const { error: pointsError } = await adminDb
    .from('profiles')
    .update(updatePayload)
    .eq('id', user.id)
  if (pointsError) return NextResponse.json({ error: 'ポイント更新失敗' }, { status: 500 })

  // 購入レコード追加
  const { error: purchaseError } = await adminDb
    .from('video_item_purchases')
    .insert({ user_id: user.id, video_item_id: videoItemId })
  if (purchaseError) {
    // ロールバック（ポイント戻す）
    await adminDb.from('profiles').update({ points: profile.points, bonus_points: profile.bonus_points ?? 0 }).eq('id', user.id)
    return NextResponse.json({ error: '購入レコード作成失敗' }, { status: 500 })
  }

  // ポイント取引履歴
  await adminDb.from('point_transactions').insert({
    user_id: user.id,
    amount: -video.price_points,
    type: 'spend',
    description: `動画購入: ${video.title}`,
  })

  return NextResponse.json({
    ok: true,
    newPoints: newPoints + (bonusDeduct > 0 ? newBonusPoints : bonusAvailable),
    videoUrl: video.video_url,
  })
}
