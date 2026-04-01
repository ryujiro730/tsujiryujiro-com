'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { TOKEN_PACKAGES } from '@/types'
import type { Profile, PointTransaction } from '@/types'

export default function PaymentPage() {
  const searchParams = useSearchParams()
  const isSuccess = searchParams.get('success') === 'true'
  const isCanceled = searchParams.get('canceled') === 'true'
  const tokensAdded = searchParams.get('tokens')

  const [profile, setProfile] = useState<Profile | null>(null)
  const [transactions, setTransactions] = useState<PointTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [profRes, txRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('point_transactions').select('*').eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(10),
      ])
      setProfile(profRes.data)
      setTransactions(txRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const handlePurchase = async (pkg: typeof TOKEN_PACKAGES[0]) => {
    setPurchasing(pkg.id)
    try {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[var(--color-primary)]" size={24} />
      </div>
    )
  }

  return (
    <div className="pt-2">
      <h1 className="text-xl font-bold mb-6">トークンを購入する</h1>

      {/* 決済結果 */}
      {isSuccess && (
        <div className="rounded-xl p-4 mb-6 text-sm" style={{ background: 'rgba(125,186,132,0.12)', border: '1px solid rgba(125,186,132,0.3)' }}>
          <p className="font-medium mb-0.5" style={{ color: 'var(--color-online)' }}>購入が完了しました</p>
          <p className="text-[var(--color-text-muted)]">{tokensAdded}トークンが追加されました。</p>
        </div>
      )}
      {isCanceled && (
        <div className="card p-4 mb-6 text-sm text-[var(--color-text-muted)]">
          購入をキャンセルしました
        </div>
      )}

      {/* 現在の残高 */}
      <div className="card p-5 mb-6">
        <p className="text-[var(--color-text-muted)] text-xs mb-3">現在の残高</p>
        <div className="flex items-end gap-6">
          <div>
            <p className="text-3xl font-bold">{profile?.points ?? 0}</p>
            <p className="text-[var(--color-text-muted)] text-xs mt-0.5">トークン</p>
          </div>
        </div>
      </div>

      {/* プラン */}
      <div className="space-y-3 mb-6">
        {TOKEN_PACKAGES.map((pkg) => (
          <div
            key={pkg.id}
            className={`rounded-xl p-4 border flex items-center justify-between ${
              pkg.is_popular
                ? 'border-[var(--color-border-warm)]'
                : 'border-[var(--color-border)]'
            }`}
            style={{ background: pkg.is_popular ? 'var(--color-surface-2)' : 'var(--color-surface)' }}
          >
            <div>
              {pkg.is_popular && (
                <p className="text-xs mb-1" style={{ color: 'var(--color-accent)' }}>いちばん人気</p>
              )}
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold">{pkg.tokens}</span>
                <span className="text-sm text-[var(--color-text-muted)]">トークン</span>
              </div>
              <p className="text-[var(--color-text-muted)] text-xs mt-0.5">
                1通あたり ¥{Math.round(pkg.price_yen / pkg.tokens)}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-lg font-bold" style={{ color: 'var(--color-accent)' }}>
                ¥{pkg.price_yen.toLocaleString()}
              </p>
              <button
                onClick={() => handlePurchase(pkg)}
                disabled={!!purchasing}
                className="btn-primary px-4 py-2 text-sm disabled:opacity-60 flex items-center gap-1.5"
              >
                {purchasing === pkg.id && <Loader2 size={13} className="animate-spin" />}
                購入
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 注意書き */}
      <div className="text-xs text-[var(--color-text-muted)] space-y-1 mb-8 leading-relaxed">
        <p>・現在テストモードで動作しています（実際の請求は発生しません）</p>
        <p>・テストカード: 4242 4242 4242 4242 / 任意の有効期限 / 任意のCVC</p>
        <p>・購入したトークンに有効期限はありません</p>
      </div>

      {/* 取引履歴 */}
      {transactions.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-3 text-[var(--color-text-muted)]">取引履歴</p>
          <div className="space-y-1.5">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: 'var(--color-surface)' }}>
                <div>
                  <p className="text-sm">{tx.description}</p>
                  <p className="text-[var(--color-text-muted)] text-xs">{new Date(tx.created_at).toLocaleDateString('ja-JP')}</p>
                </div>
                <span className={`text-sm font-medium ${tx.amount > 0 ? '' : 'text-[var(--color-text-muted)]'}`}
                  style={tx.amount > 0 ? { color: 'var(--color-online)' } : {}}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}T
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
