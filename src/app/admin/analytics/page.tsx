import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type Period = 'hourly' | 'daily' | 'monthly'
type SearchParams = { period?: string }

function getPeriodRange(period: Period): { from: Date; to: Date } {
  const to = new Date()
  const from = new Date()
  if (period === 'hourly') {
    from.setHours(from.getHours() - 23)
    from.setMinutes(0); from.setSeconds(0); from.setMilliseconds(0)
  } else if (period === 'daily') {
    from.setDate(from.getDate() - 29)
    from.setHours(0, 0, 0, 0)
  } else {
    from.setMonth(from.getMonth() - 11)
    from.setDate(1); from.setHours(0, 0, 0, 0)
  }
  return { from, to }
}

function getBucketKey(dateStr: string, period: Period): string {
  const d = new Date(dateStr)
  if (period === 'hourly') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00`
  if (period === 'daily') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function generateBuckets(period: Period): string[] {
  const buckets: string[] = []
  const now = new Date()
  if (period === 'hourly') {
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now)
      d.setHours(d.getHours() - i)
      buckets.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00`)
    }
  } else if (period === 'daily') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      buckets.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now)
      d.setMonth(d.getMonth() - i)
      buckets.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
  }
  return buckets
}

function formatBucketLabel(bucket: string, period: Period): string {
  if (period === 'hourly') return bucket.slice(5, 16).replace('-', '/').replace('-', '/') // MM/DD HH:00
  if (period === 'daily') {
    const [y, m, d] = bucket.split('-')
    return `${y}/${parseInt(m)}/${parseInt(d)}`
  }
  const [y, m] = bucket.split('-')
  return `${y}/${parseInt(m)}月`
}

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  const period: Period = (searchParams.period as Period) ?? 'daily'
  const supabase = createClient()
  const { from } = getPeriodRange(period)
  const fromISO = from.toISOString()

  // admin/staffのuser_idを除外リストとして取得
  const { data: staffProfiles } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'staff'])
  const excludeIds = (staffProfiles ?? []).map(p => p.id)

  const [txRes, profilesRes, loginRes, allPayersRes] = await Promise.all([
    excludeIds.length > 0
      ? supabase.from('point_transactions').select('user_id, amount, type, price_yen, created_at').gte('created_at', fromISO).not('user_id', 'in', `(${excludeIds.join(',')})`).order('created_at', { ascending: true })
      : supabase.from('point_transactions').select('user_id, amount, type, price_yen, created_at').gte('created_at', fromISO).order('created_at', { ascending: true }),
    supabase.from('profiles').select('id, created_at').gte('created_at', fromISO).not('role', 'in', '(admin,staff)'),
    supabase.from('profiles').select('last_login_at').gte('last_login_at', fromISO).not('last_login_at', 'is', null).not('role', 'in', '(admin,staff)'),
    excludeIds.length > 0
      ? supabase.from('point_transactions').select('user_id').eq('type', 'purchase').not('user_id', 'in', `(${excludeIds.join(',')})`)
      : supabase.from('point_transactions').select('user_id').eq('type', 'purchase'),
  ])

  const transactions = txRes.data ?? []
  const newProfiles = profilesRes.data ?? []
  const logins = loginRes.data ?? []
  const payingUserIds = new Set((allPayersRes.data ?? []).map(t => t.user_id))

  const buckets = generateBuckets(period)
  type BucketData = { revenue: number; allPointsSpent: number; payingPointsSpent: number; freePointsSpent: number; registrations: number; logins: number }
  const bucketMap = new Map<string, BucketData>()
  buckets.forEach(b => bucketMap.set(b, { revenue: 0, allPointsSpent: 0, payingPointsSpent: 0, freePointsSpent: 0, registrations: 0, logins: 0 }))

  for (const tx of transactions) {
    const key = getBucketKey(tx.created_at, period)
    const bucket = bucketMap.get(key)
    if (!bucket) continue
    if (tx.type === 'purchase' && tx.price_yen != null) bucket.revenue += tx.price_yen
    if (tx.type === 'spend') {
      bucket.allPointsSpent += Math.abs(tx.amount)
      if (payingUserIds.has(tx.user_id)) bucket.payingPointsSpent += Math.abs(tx.amount)
      else bucket.freePointsSpent += Math.abs(tx.amount)
    }
  }
  for (const p of newProfiles) {
    const bucket = bucketMap.get(getBucketKey(p.created_at, period))
    if (bucket) bucket.registrations++
  }
  for (const p of logins) {
    if (!p.last_login_at) continue
    const bucket = bucketMap.get(getBucketKey(p.last_login_at, period))
    if (bucket) bucket.logins++
  }

  const totals = buckets.reduce((acc, b) => {
    const d = bucketMap.get(b)!
    return { revenue: acc.revenue + d.revenue, allPointsSpent: acc.allPointsSpent + d.allPointsSpent, payingPointsSpent: acc.payingPointsSpent + d.payingPointsSpent, freePointsSpent: acc.freePointsSpent + d.freePointsSpent, registrations: acc.registrations + d.registrations, logins: acc.logins + d.logins }
  }, { revenue: 0, allPointsSpent: 0, payingPointsSpent: 0, freePointsSpent: 0, registrations: 0, logins: 0 })

  const maxRevenue = Math.max(...buckets.map(b => bucketMap.get(b)!.revenue), 1)
  const reversedBuckets = [...buckets].reverse()

  const periodTabs: { value: Period; label: string }[] = [
    { value: 'hourly', label: '時間別（24h）' },
    { value: 'daily', label: '日別（30日）' },
    { value: 'monthly', label: '月別（12ヶ月）' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">集計</h1>
        <div className="flex gap-1.5">
          {periodTabs.map(tab => (
            <Link key={tab.value} href={`?period=${tab.value}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === tab.value ? 'text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
              style={{ background: period === tab.value ? 'var(--color-primary)' : 'var(--color-surface-2)' }}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        {[
          { label: '課金額', value: `¥${totals.revenue.toLocaleString()}`, color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
          { label: 'PT消費（全体）', value: `${totals.allPointsSpent.toLocaleString()}`, unit: 'T', color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
          { label: 'PT消費（課金）', value: `${totals.payingPointsSpent.toLocaleString()}`, unit: 'T', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
          { label: 'PT消費（無料）', value: `${totals.freePointsSpent.toLocaleString()}`, unit: 'T', color: '#ec4899', bg: 'rgba(236,72,153,0.08)' },
          { label: '新規登録', value: `${totals.registrations}`, unit: '人', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
          { label: 'ログイン', value: `${totals.logins}`, unit: '人', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
        ].map(card => (
          <div key={card.label} className="rounded-xl px-4 py-3 border" style={{ background: card.bg, borderColor: card.color + '33' }}>
            <p className="text-[11px] text-[var(--color-text-muted)] mb-1">{card.label}</p>
            <p className="text-lg font-bold leading-tight" style={{ color: card.color }}>
              {card.value}<span className="text-sm font-normal ml-0.5">{card.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* 収益ミニチャート */}
      {totals.revenue > 0 && (
        <div className="card p-4">
          <p className="text-xs text-[var(--color-text-muted)] mb-3 font-medium">課金額推移</p>
          <div className="flex items-end gap-px" style={{ height: 56 }}>
            {buckets.map(bucket => {
              const val = bucketMap.get(bucket)!.revenue
              const pct = (val / maxRevenue) * 100
              return (
                <div key={bucket} className="flex-1 flex flex-col justify-end group relative" style={{ minWidth: 0 }}>
                  <div style={{ height: `${Math.max(pct, val > 0 ? 4 : 0)}%`, background: '#10b981', opacity: 0.75, borderRadius: '2px 2px 0 0', minHeight: val > 0 ? 3 : 0 }} />
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 pointer-events-none">
                    <div className="card px-2 py-1 text-xs whitespace-nowrap">
                      <div className="text-[var(--color-text-muted)]">{formatBucketLabel(bucket, period)}</div>
                      <div className="font-bold text-green-400">¥{val.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-[var(--color-text-muted)]">
            <span>{formatBucketLabel(buckets[0], period)}</span>
            <span>{formatBucketLabel(buckets[Math.floor(buckets.length / 2)], period)}</span>
            <span>{formatBucketLabel(buckets[buckets.length - 1], period)}</span>
          </div>
        </div>
      )}

      {/* メインテーブル */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: 'var(--color-surface-2)', borderBottom: '2px solid var(--color-border)' }}>
                <th className="text-left text-xs font-semibold text-[var(--color-text-muted)] px-4 py-3 whitespace-nowrap">期間</th>
                <th className="text-right text-xs font-semibold px-4 py-3 whitespace-nowrap" style={{ color: '#10b981' }}>課金額</th>
                <th className="text-right text-xs font-semibold px-4 py-3 whitespace-nowrap" style={{ color: '#6366f1' }}>PT消費<span className="text-[10px] font-normal ml-1">全体</span></th>
                <th className="text-right text-xs font-semibold px-4 py-3 whitespace-nowrap" style={{ color: '#8b5cf6' }}>PT消費<span className="text-[10px] font-normal ml-1">課金</span></th>
                <th className="text-right text-xs font-semibold px-4 py-3 whitespace-nowrap" style={{ color: '#ec4899' }}>PT消費<span className="text-[10px] font-normal ml-1">無料</span></th>
                <th className="text-right text-xs font-semibold px-4 py-3 whitespace-nowrap" style={{ color: '#f59e0b' }}>新規登録</th>
                <th className="text-right text-xs font-semibold px-4 py-3 whitespace-nowrap" style={{ color: '#3b82f6' }}>ログイン</th>
              </tr>
            </thead>
            <tbody>
              {/* 合計行 */}
              <tr style={{ background: 'rgba(232,67,143,0.05)', borderBottom: '2px solid var(--color-border)' }}>
                <td className="px-4 py-2.5 font-bold text-xs">合計</td>
                <td className="px-4 py-2.5 text-right font-bold" style={{ color: '#10b981' }}>¥{totals.revenue.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right font-bold" style={{ color: '#6366f1' }}>{totals.allPointsSpent.toLocaleString()}T</td>
                <td className="px-4 py-2.5 text-right font-bold" style={{ color: '#8b5cf6' }}>{totals.payingPointsSpent.toLocaleString()}T</td>
                <td className="px-4 py-2.5 text-right font-bold" style={{ color: '#ec4899' }}>{totals.freePointsSpent.toLocaleString()}T</td>
                <td className="px-4 py-2.5 text-right font-bold" style={{ color: '#f59e0b' }}>{totals.registrations}人</td>
                <td className="px-4 py-2.5 text-right font-bold" style={{ color: '#3b82f6' }}>{totals.logins}人</td>
              </tr>
              {reversedBuckets.map((bucket, i) => {
                const d = bucketMap.get(bucket)!
                const hasData = d.revenue > 0 || d.allPointsSpent > 0 || d.registrations > 0 || d.logins > 0
                return (
                  <tr
                    key={bucket}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)',
                      opacity: hasData ? 1 : 0.35,
                    }}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                      {formatBucketLabel(bucket, period)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium whitespace-nowrap" style={{ color: d.revenue > 0 ? '#10b981' : 'var(--color-text-muted)' }}>
                      {d.revenue > 0 ? `¥${d.revenue.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap" style={{ color: d.allPointsSpent > 0 ? '#6366f1' : 'var(--color-text-muted)' }}>
                      {d.allPointsSpent > 0 ? `${d.allPointsSpent.toLocaleString()}T` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap" style={{ color: d.payingPointsSpent > 0 ? '#8b5cf6' : 'var(--color-text-muted)' }}>
                      {d.payingPointsSpent > 0 ? `${d.payingPointsSpent.toLocaleString()}T` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap" style={{ color: d.freePointsSpent > 0 ? '#ec4899' : 'var(--color-text-muted)' }}>
                      {d.freePointsSpent > 0 ? `${d.freePointsSpent.toLocaleString()}T` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap" style={{ color: d.registrations > 0 ? '#f59e0b' : 'var(--color-text-muted)' }}>
                      {d.registrations > 0 ? `${d.registrations}人` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap" style={{ color: d.logins > 0 ? '#3b82f6' : 'var(--color-text-muted)' }}>
                      {d.logins > 0 ? `${d.logins}人` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
