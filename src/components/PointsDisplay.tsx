'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export function PointsDisplay({ initialPoints }: { initialPoints: number }) {
  const [points, setPoints] = useState(initialPoints)

  useEffect(() => {
    const handler = (e: Event) => {
      setPoints((e as CustomEvent<{ points: number }>).detail.points)
    }
    window.addEventListener('pointsUpdated', handler)
    return () => window.removeEventListener('pointsUpdated', handler)
  }, [])

  return (
    <Link
      href="/payment"
      className="flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors hover:opacity-80"
      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-warm)' }}
    >
      <span className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>
        {points.toLocaleString()}
      </span>
      <span className="text-[10px] text-[var(--color-text-muted)]">pt</span>
      <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center ml-0.5"
        style={{ background: 'var(--color-primary)' }}>
        <Plus size={9} color="#fff" strokeWidth={3} />
      </div>
    </Link>
  )
}
