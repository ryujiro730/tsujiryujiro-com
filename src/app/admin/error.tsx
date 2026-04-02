'use client'

import { useEffect } from 'react'

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Admin route error:', error)
  }, [error])

  return (
    <div className="flex items-center justify-center px-4" style={{ minHeight: '60vh' }}>
      <div className="text-center max-w-sm">
        <p className="text-3xl mb-3">⚠️</p>
        <h2 className="font-bold mb-2">エラーが発生しました</h2>
        <p className="text-[var(--color-text-muted)] text-sm mb-2 font-mono text-xs bg-[var(--color-surface-2)] px-3 py-2 rounded-lg">
          {error.message || 'Unknown error'}
        </p>
        {error.digest && (
          <p className="text-xs text-[var(--color-text-muted)] mb-4">digest: {error.digest}</p>
        )}
        <button onClick={reset} className="btn-primary px-5 py-2 text-sm">
          再試行
        </button>
      </div>
    </div>
  )
}
