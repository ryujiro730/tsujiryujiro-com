'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function UnlockWithPointsButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleUnlock() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/points/unlock-character', { method: 'POST' })
    const data = await res.json()
    setLoading(false)
    if (data.ok) {
      router.refresh()
    } else {
      setError(data.message ?? 'エラーが発生しました')
    }
  }

  return (
    <div style={{ textAlign: 'center', width: '100%' }}>
      <button
        onClick={handleUnlock}
        disabled={loading}
        style={{
          fontSize: '10px', color: '#ffd700', fontWeight: 600,
          background: 'none', border: '1px solid rgba(255,215,0,0.4)',
          borderRadius: '6px', padding: '4px 10px', cursor: 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? '処理中...' : '3,000ptで解放'}
      </button>
      {error && <p style={{ fontSize: '9px', color: '#ff6b6b', marginTop: '4px', padding: '0 4px' }}>{error}</p>}
    </div>
  )
}
