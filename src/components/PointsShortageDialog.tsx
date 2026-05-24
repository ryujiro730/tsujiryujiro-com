'use client'

import { TOKEN_PACKAGES } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'

interface Props {
  currentPoints: number
  requiredPoints: number
  onClose: () => void
}

export function PointsShortageDialog({ currentPoints, requiredPoints, onClose }: Props) {
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const shortage = requiredPoints - currentPoints

  const handlePurchase = async (pkg: typeof TOKEN_PACKAGES[0]) => {
    setPurchasing(pkg.id)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkg.id, userId: user.id, tokens: pkg.tokens, priceYen: pkg.price_yen }),
      })
      if (!res.ok) throw new Error()
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch {
      alert('決済の開始に失敗しました')
    } finally {
      setPurchasing(null)
    }
  }

  // 不足分をカバーできる最小パックを先頭に
  const sorted = [...TOKEN_PACKAGES].sort((a, b) => {
    const aCover = a.tokens >= shortage
    const bCover = b.tokens >= shortage
    if (aCover && !bCover) return -1
    if (!aCover && bCover) return 1
    return a.price_yen - b.price_yen
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl pb-safe"
        style={{ background: 'var(--color-surface)', maxHeight: '85vh', overflowY: 'auto' }}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <p className="font-bold text-base">ポイントが足りません</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              残高 <strong>{currentPoints.toLocaleString()}pt</strong>
              　 必要 <strong style={{ color: 'var(--color-primary)' }}>{requiredPoints}pt</strong>
              　 不足 <strong style={{ color: '#ef4444' }}>{shortage}pt</strong>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--color-text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="h-px mx-5" style={{ background: 'var(--color-border)' }} />

        {/* パック一覧 */}
        <div className="px-4 pt-3 pb-6 flex flex-col gap-2.5">
          {sorted.map((pkg) => {
            const covers = pkg.tokens >= shortage
            const bonusPct = pkg.bonus_points > 0
              ? Math.round(pkg.bonus_points / (pkg.tokens - pkg.bonus_points) * 100)
              : 0
            return (
              <button
                key={pkg.id}
                onClick={() => handlePurchase(pkg)}
                disabled={!!purchasing}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all disabled:opacity-60"
                style={{
                  background: covers ? 'linear-gradient(135deg, rgba(232,121,160,0.12), rgba(196,80,128,0.06))' : 'var(--color-surface-2)',
                  border: covers ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                }}
              >
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{pkg.tokens.toLocaleString()}pt</span>
                    {pkg.bonus_points > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                        style={{ background: 'rgba(232,121,160,0.15)', color: 'var(--color-primary)' }}>
                        <Sparkles size={9} />+{bonusPct}%
                      </span>
                    )}
                    {covers && pkg.is_popular && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: 'var(--color-primary)', color: '#fff' }}>人気</span>
                    )}
                  </div>
                  {pkg.bonus_points > 0 && (
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {(pkg.tokens - pkg.bonus_points).toLocaleString()}pt + ボーナス{pkg.bonus_points.toLocaleString()}pt
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm">¥{pkg.price_yen.toLocaleString()}</span>
                  {purchasing === pkg.id && (
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>処理中...</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
