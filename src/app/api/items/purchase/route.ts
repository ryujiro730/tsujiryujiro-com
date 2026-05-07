import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/items/purchase - アイテム購入（ポイント消費）
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { itemId } = await req.json()
  if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 })

  // アイテム情報取得
  const { data: item } = await supabase
    .from('items').select('*').eq('id', itemId).eq('is_active', true).single()
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

  // ユーザーのポイント確認
  const { data: profile } = await supabase
    .from('profiles').select('points').eq('id', user.id).single()
  if (!profile || profile.points < item.price_points) {
    return NextResponse.json({ error: 'ポイントが不足しています' }, { status: 400 })
  }

  // ポイント消費
  const { error: pointsError } = await supabase
    .from('profiles')
    .update({ points: profile.points - item.price_points })
    .eq('id', user.id)
  if (pointsError) return NextResponse.json({ error: 'ポイント更新失敗' }, { status: 500 })

  // インベントリ追加 or 数量+1
  const { data: existing } = await supabase
    .from('user_items').select('*').eq('user_id', user.id).eq('item_id', itemId).single()

  if (existing) {
    await supabase
      .from('user_items')
      .update({ quantity: existing.quantity + 1 })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('user_items')
      .insert({ user_id: user.id, item_id: itemId, quantity: 1 })
  }

  // ポイント取引履歴
  await supabase.from('point_transactions').insert({
    user_id: user.id,
    amount: -item.price_points,
    type: 'spend',
    description: `アイテム購入: ${item.name}`,
  })

  return NextResponse.json({ success: true, remainingPoints: profile.points - item.price_points })
}
