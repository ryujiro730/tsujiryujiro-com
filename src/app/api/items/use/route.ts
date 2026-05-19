export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/items/use - アイテムをチャットで使用（1回消費 + メッセージ送信）
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { itemId, conversationId } = await req.json()
  if (!itemId || !conversationId) {
    return NextResponse.json({ error: 'itemId and conversationId required' }, { status: 400 })
  }

  // インベントリ確認
  const { data: userItem } = await supabase
    .from('user_items')
    .select('*, item:items(*)')
    .eq('user_id', user.id)
    .eq('item_id', itemId)
    .single()

  if (!userItem || userItem.quantity <= 0) {
    return NextResponse.json({ error: 'アイテムが見つかりません' }, { status: 404 })
  }

  // 数量を減らす
  await supabase
    .from('user_items')
    .update({ quantity: userItem.quantity - 1 })
    .eq('id', userItem.id)

  const item = userItem.item

  // チャットにメッセージとして送信（アイテム使用）
  const { data: msg } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_role: 'user',
      content: `${item.name}を贈りました`,
      points_used: 0,
      metadata: {
        item_id: item.id,
        item_name: item.name,
        item_image_url: item.image_url,
      },
    })
    .select()
    .single()

  if (!msg) return NextResponse.json({ error: 'メッセージ送信失敗' }, { status: 500 })

  // conversations.last_message_at を更新
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString(), is_unread_staff: true })
    .eq('id', conversationId)

  return NextResponse.json({ success: true, message: msg, remainingQuantity: userItem.quantity - 1 })
}
