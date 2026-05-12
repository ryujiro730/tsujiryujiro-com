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
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
      {TABS.map(({ key, label }) => {
        const active = key === current
        return (
          <button
            key={key}
            onClick={() => select(key)}
            style={{
              fontSize: '12px',
              padding: '6px 16px',
              borderRadius: '99px',
              fontWeight: active ? 700 : 500,
              letterSpacing: '0.02em',
              transition: 'all 0.15s',
              cursor: 'pointer',
              border: active ? 'none' : '1px solid #e0e0e0',
              background: active ? '#e8438f' : '#fff',
              color: active ? '#fff' : '#666',
              boxShadow: active ? '0 2px 8px rgba(232,67,143,0.25)' : 'none',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
