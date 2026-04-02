'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <div className="min-h-screen warm-bg flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-4xl mb-4">😔</p>
        <h1 className="text-lg font-bold mb-2">エラーが発生しました</h1>
        <p className="text-[var(--color-text-muted)] text-sm mb-6 leading-relaxed">
          申し訳ありません。予期しないエラーが発生しました。
        </p>
        {error.message && (
          <p className="text-xs text-[var(--color-text-muted)] mb-4 font-mono bg-[var(--color-surface-2)] px-3 py-2 rounded-lg break-all">
            {error.message}
          </p>
        )}
        <button
          onClick={reset}
          className="btn-primary px-6 py-2.5 text-sm"
        >
          もう一度試す
        </button>
      </div>
    </div>
  )
}
