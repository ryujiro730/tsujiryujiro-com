'use client'

import { useRouter, useSearchParams } from 'next/navigation'

type BlogCategory = 'all' | 'news' | 'howto' | 'column' | 'update'

const TABS: { key: BlogCategory; label: string }[] = [
  { key: 'all',    label: 'すべて' },
  { key: 'news',   label: 'お知らせ' },
  { key: 'howto',  label: '使い方' },
  { key: 'column', label: 'コラム' },
  { key: 'update', label: 'アップデート' },
]

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
      {TABS.map(({ key, label }) => {
        const active = key === current
        return (
          <button
            key={key}
            onClick={() => select(key)}
            className="text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-150"
            style={
              active
                ? { background: 'var(--color-primary)', color: '#fff' }
                : { background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }
            }
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
