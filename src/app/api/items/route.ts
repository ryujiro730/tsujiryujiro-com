import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/items - アクティブなアイテム一覧 + カテゴリー一覧 + ユーザーインベントリ
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: items }, { data: categories }, { data: inventory }] = await Promise.all([
    supabase.from('items').select('*, category:item_categories(*)').eq('is_active', true).order('sort_order').order('created_at'),
    supabase.from('item_categories').select('*').order('sort_order').order('created_at'),
    supabase.from('user_items').select('*, item:items(*, category:item_categories(*))').eq('user_id', user.id),
  ])

  return NextResponse.json({ items: items ?? [], categories: categories ?? [], inventory: inventory ?? [] })
}
