'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { CATEGORY_LABELS, BlogCategory } from '@/lib/blog'

const TABS: BlogCategory[] = ['all', 'news', 'howto', 'column', 'update']

export function CategoryTabs({ current }: { current: BlogCategory }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function select(cat: BlogCategory) {
    const params = new URLSearchParams(searchParams.toString())
    if (cat === 'all') params.delete('category')
    else params.set('category', cat)
    router.push(`/blog?${params.toString()}`)
  }

  return (
    <div className="flex gap-2 flex-wrap mb-6">
      {TABS.map(tab => {
        const active = tab === current
        return (
          <button
            key={tab}
            onClick={() => select(tab)}
            className="text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-150"
            style={
              active
                ? { background: 'var(--color-primary)', color: '#fff' }
                : { background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }
            }
          >
            {CATEGORY_LABELS[tab]}
          </button>
        )
      })}
    </div>
  )
}
