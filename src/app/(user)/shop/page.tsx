'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShoppingBag, Loader2, Gift, Check } from 'lucide-react'
import type { Item, ItemCategory, UserItem } from '@/types'
import Link from 'next/link'

export default function ShopPage() {
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [inventory, setInventory] = useState<UserItem[]>([])
  const [points, setPoints] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [bought, setBought] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const res = await fetch('/api/items')
    if (res.ok) {
      const { items: shopItems, categories: cats, inventory: inv, points: pts } = await res.json()
      setItems(shopItems)
      setCategories(cats)
      setInventory(inv)
      setPoints(pts)
    }
    setLoading(false)
  }

  const buyItem = async (item: Item) => {
    if (buying) return
    setBuying(item.id)
    const res = await fetch('/api/items/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.id }),
    })
    const data = await res.json()
    if (!res.ok) {
      alert(data.error || '購入に失敗しました')
      setBuying(null)
      return
    }

    setPoints(data.remainingPoints)
    setInventory(prev => {
      const existing = prev.find(i => i.item_id === item.id)
      if (existing) return prev.map(i => i.item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { id: '', user_id: '', item_id: item.id, quantity: 1, created_at: '', item }]
    })

    setBuying(null)
    setBought(item.id)
    setTimeout(() => setBought(null), 2000)
  }

  const getQuantity = (itemId: string) => inventory.find(i => i.item_id === itemId)?.quantity ?? 0

  // カテゴリー選択時はそのカテゴリーだけ、すべての時はカテゴリーごとにグループ化
  const filteredItems = selectedCategory
    ? items.filter(i => i.category_id === selectedCategory)
    : items

  // 「すべて」表示時のグループ化（カテゴリーあり → カテゴリーなしの順）
  const groupedSections: { category: ItemCategory | null; items: Item[] }[] = []
  if (!selectedCategory) {
    categories.forEach(cat => {
      const catItems = items.filter(i => i.category_id === cat.id)
      if (catItems.length > 0) groupedSections.push({ category: cat, items: catItems })
    })
    const uncategorized = items.filter(i => !i.category_id)
    if (uncategorized.length > 0) groupedSections.push({ category: null, items: uncategorized })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-[var(--color-primary)]" size={28} />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <ShoppingBag size={20} className="text-[var(--color-primary)]" />
          <h1 className="text-lg font-bold">ショップ</h1>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-warm)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>{points}</span>
          <span className="text-xs text-[var(--color-text-muted)]">pt</span>
        </div>
      </div>

      {/* カテゴリータブ */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setSelectedCategory(null)}
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
            style={!selectedCategory
              ? { background: 'var(--color-primary)', color: '#fff' }
              : { background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }
            }
          >
            すべて
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={selectedCategory === cat.id
                ? { background: 'var(--color-primary)', color: '#fff' }
                : { background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }
              }
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-16 text-[var(--color-text-muted)]">
          <Gift size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">アイテムはまだありません</p>
        </div>
      ) : selectedCategory ? (
        /* カテゴリー選択時：フラット表示 */
        filteredItems.length === 0 ? (
          <div className="text-center py-16 text-[var(--color-text-muted)]">
            <p className="text-sm">このジャンルにアイテムはありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map(item => <ItemCard key={item.id} item={item} qty={getQuantity(item.id)} buying={buying} bought={bought} points={points} onBuy={buyItem} />)}
          </div>
        )
      ) : (
        /* すべて表示：カテゴリーセクションごとに区切り */
        <div className="space-y-6">
          {groupedSections.map(({ category, items: sectionItems }) => (
            <div key={category?.id ?? '__none__'}>
              <h2 className="text-sm font-bold mb-3 flex items-center gap-1.5">
                <span style={{ color: 'var(--color-primary)' }}>|</span>
                {category?.name ?? 'その他'}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {sectionItems.map(item => <ItemCard key={item.id} item={item} qty={getQuantity(item.id)} buying={buying} bought={bought} points={points} onBuy={buyItem} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 text-center">
        <Link href="/payment" className="text-sm text-[var(--color-primary)] underline-offset-2 hover:underline">
          ポイントを購入する →
        </Link>
      </div>
    </div>
  )
}

function ItemCard({ item, qty, buying, bought, points, onBuy }: {
  item: Item
  qty: number
  buying: string | null
  bought: string | null
  points: number
  onBuy: (item: Item) => void
}) {
  const isBuying = buying === item.id
  const isBought = bought === item.id
  const canAfford = points >= item.price_points

  return (
    <div className="glass rounded-2xl overflow-hidden flex flex-col">
      {item.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.image_url} alt={item.name} className="w-full object-cover" style={{ aspectRatio: '1' }} />
      ) : (
        <div className="w-full flex items-center justify-center bg-[var(--color-surface-2)]" style={{ aspectRatio: '1' }}>
          <Gift size={36} className="text-[var(--color-text-muted)] opacity-40" />
        </div>
      )}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div>
          <p className="font-semibold text-sm">{item.name}</p>
          {item.description && (
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">{item.description}</p>
          )}
        </div>
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>{item.price_points}</span>
            <span className="text-xs text-[var(--color-text-muted)]">pt</span>
          </div>
          {qty > 0 && (
            <span className="text-xs text-[var(--color-text-muted)]">所持: {qty}個</span>
          )}
        </div>
        <button
          onClick={() => onBuy(item)}
          disabled={isBuying || !canAfford}
          className="btn-primary py-2 text-xs flex items-center justify-center gap-1.5 disabled:opacity-40"
          style={{ borderRadius: '10px' }}
        >
          {isBuying ? (
            <><Loader2 size={12} className="animate-spin" />購入中...</>
          ) : isBought ? (
            <><Check size={12} />購入完了！</>
          ) : !canAfford ? (
            'ポイント不足'
          ) : (
            '購入する'
          )}
        </button>
      </div>
    </div>
  )
}
