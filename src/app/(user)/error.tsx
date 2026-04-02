'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function UserError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter()

  useEffect(() => {
    console.error('User route error:', error)
  }, [error])

  return (
    <div className="flex items-center justify-center px-4" style={{ minHeight: '60vh' }}>
      <div className="text-center max-w-sm">
        <p className="text-3xl mb-3">😔</p>
        <h2 className="font-bold mb-2">エラーが発生しました</h2>
        <p className="text-[var(--color-text-muted)] text-sm mb-5">
          {error.message || '予期しないエラーが発生しました'}
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="btn-primary px-5 py-2 text-sm">
            もう一度試す
          </button>
          <button onClick={() => router.push('/characters')} className="btn-ghost px-5 py-2 text-sm">
            トップへ
          </button>
        </div>
      </div>
    </div>
  )
}
