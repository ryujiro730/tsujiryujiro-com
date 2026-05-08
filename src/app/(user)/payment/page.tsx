'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Sparkles, History } from 'lucide-react'
import { TOKEN_PACKAGES } from '@/types'
import type { Profile, PointTransaction } from '@/types'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default function PaymentPage() {
  const searchParams = useSearchParams()
  const isSuccess = searchParams.get('success') === 'true'
  const isCanceled = searchParams.get('canceled') === 'true'
  const pointsAdded = searchParams.get('points')

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
          .order('created_at', { ascending: false }).limit(20),
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
    <div className="pt-2 max-w-lg">
      <h1 className="text-xl font-bold mb-6">ポイントを購入する</h1>

      {/* 決済結果 */}
      {isSuccess && (
        <div className="rounded-xl p-4 mb-6 text-sm" style={{ background: 'rgba(125,186,132,0.12)', border: '1px solid rgba(125,186,132,0.3)' }}>
          <p className="font-semibold mb-0.5" style={{ color: '#7ec850' }}>購入が完了しました！</p>
          <p className="text-[var(--color-text-muted)]">{Number(pointsAdded).toLocaleString()}ポイントが追加されました。</p>
        </div>
      )}
      {isCanceled && (
        <div className="card p-4 mb-6 text-sm text-[var(--color-text-muted)]">購入をキャンセルしました</div>
      )}

      {/* 現在の残高 */}
      <div className="card p-5 mb-6" style={{ background: 'linear-gradient(135deg, var(--color-surface-2), var(--color-surface))' }}>
        <p className="text-xs text-[var(--color-text-muted)] mb-2">現在の残高</p>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-bold" style={{ color: 'var(--color-primary)' }}>
            {(profile?.points ?? 0).toLocaleString()}
          </span>
          <span className="text-sm text-[var(--color-text-muted)] mb-1">ポイント</span>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">1ポイント = 1円相当</p>
      </div>

      {/* パッケージ一覧 */}
      <div className="flex flex-col gap-3 mb-8">
        {TOKEN_PACKAGES.map((pkg) => {
          const bonusPct = pkg.bonus_points > 0 ? Math.round(pkg.bonus_points / (pkg.tokens - pkg.bonus_points) * 100) : 0
          return (
            <div
              key={pkg.id}
              className="card p-4 flex items-center gap-4"
              style={pkg.is_popular ? { borderColor: 'var(--color-primary)', boxShadow: '0 0 16px var(--color-primary-glow)' } : {}}
            >
              {/* ポイント情報 */}
              <div className="flex-1 min-w-0">
                {pkg.is_popular && (
                  <div className="flex items-center gap-1 mb-1">
                    <Sparkles size={11} style={{ color: 'var(--color-primary)' }} />
                    <span className="text-[11px] font-bold" style={{ color: 'var(--color-primary)' }}>人気No.1</span>
                  </div>
                )}
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-xl font-bold">{pkg.tokens.toLocaleString()}</span>
                  <span className="text-sm text-[var(--color-text-muted)]">pt</span>
                  {pkg.bonus_points > 0 && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(232,121,160,0.15)', color: 'var(--color-primary)' }}>
                      +{bonusPct}% ボーナス
                    </span>
                  )}
                </div>
                {pkg.bonus_points > 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {(pkg.tokens - pkg.bonus_points).toLocaleString()}pt + ボーナス{pkg.bonus_points.toLocaleString()}pt
                  </p>
                ) : (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    1pt = 1円
                  </p>
                )}
              </div>

              {/* 価格・ボタン */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-lg font-bold">¥{pkg.price_yen.toLocaleString()}</span>
                <button
                  onClick={() => handlePurchase(pkg)}
                  disabled={!!purchasing}
                  className="btn-primary px-4 py-2 text-sm disabled:opacity-60 flex items-center gap-1.5"
                  style={{ borderRadius: '10px', minWidth: '68px', justifyContent: 'center' }}
                >
                  {purchasing === pkg.id
                    ? <Loader2 size={13} className="animate-spin" />
                    : '購入'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* 注意書き */}
      <div className="text-xs text-[var(--color-text-muted)] space-y-1 mb-8 leading-relaxed">
        <p>・ポイントは購入日から有効で、有効期限はありません</p>
        <p>・購入したポイントの返金はできません</p>
        <p>・現在テストモードで動作しています（実際の請求は発生しません）</p>
        <p>・テストカード: 4242 4242 4242 4242 / 任意の有効期限 / 任意のCVC</p>
      </div>

      {/* 取引履歴 */}
      {transactions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <History size={15} className="text-[var(--color-text-muted)]" />
            <p className="text-sm font-semibold">購入・利用履歴</p>
          </div>
          <div className="card overflow-hidden">
            {transactions.map((tx, i) => (
              <div
                key={tx.id}
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: i < transactions.length - 1 ? '1px solid var(--color-border)' : 'none' }}
              >
                <div>
                  <p className="text-sm">{tx.description}</p>
                  <p className="text-[var(--color-text-muted)] text-xs">
                    {format(new Date(tx.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                  </p>
                </div>
                <span className="text-sm font-semibold"
                  style={{ color: tx.amount > 0 ? '#7ec850' : 'var(--color-text-muted)' }}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}pt
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
