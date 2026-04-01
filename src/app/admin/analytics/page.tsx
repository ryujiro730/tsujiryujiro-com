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
  if (period === 'hourly') return bucket.slice(11, 16) // HH:MM
  if (period === 'daily') {
    const [, m, d] = bucket.split('-')
    return `${parseInt(m)}/${parseInt(d)}`
  }
  const [y, m] = bucket.split('-')
  return `${y}/${parseInt(m)}`
}

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  const period: Period = (searchParams.period as Period) ?? 'daily'
  const supabase = createClient()
  const { from, to } = getPeriodRange(period)
  const fromISO = from.toISOString()

  // Fetch all data for the period
  const [txRes, profilesRes, loginRes] = await Promise.all([
    supabase
      .from('point_transactions')
      .select('user_id, amount, type, price_yen, created_at')
      .gte('created_at', fromISO)
      .order('created_at', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, created_at')
      .gte('created_at', fromISO),
    supabase
      .from('profiles')
      .select('last_login_at')
      .gte('last_login_at', fromISO)
      .not('last_login_at', 'is', null),
  ])

  const transactions = txRes.data ?? []
  const newProfiles = profilesRes.data ?? []
  const logins = loginRes.data ?? []

  // Find paying user IDs (users who have ever made a purchase)
  const payingUserIds = new Set(
    transactions.filter(t => t.type === 'purchase').map(t => t.user_id)
  )

  // Build bucket maps
  const buckets = generateBuckets(period)
  type BucketData = {
    revenue: number
    allPointsSpent: number
    payingPointsSpent: number
    registrations: number
    logins: number
  }
  const bucketMap = new Map<string, BucketData>()
  buckets.forEach(b => bucketMap.set(b, { revenue: 0, allPointsSpent: 0, payingPointsSpent: 0, registrations: 0, logins: 0 }))

  // Aggregate transactions
  for (const tx of transactions) {
    const key = getBucketKey(tx.created_at, period)
    const bucket = bucketMap.get(key)
    if (!bucket) continue
    if (tx.type === 'purchase' && tx.price_yen != null) {
      bucket.revenue += tx.price_yen
    }
    if (tx.type === 'spend') {
      bucket.allPointsSpent += Math.abs(tx.amount)
      if (payingUserIds.has(tx.user_id)) {
        bucket.payingPointsSpent += Math.abs(tx.amount)
      }
    }
  }

  // Aggregate registrations
  for (const p of newProfiles) {
    const key = getBucketKey(p.created_at, period)
    const bucket = bucketMap.get(key)
    if (bucket) bucket.registrations++
  }

  // Aggregate logins
  for (const p of logins) {
    if (!p.last_login_at) continue
    const key = getBucketKey(p.last_login_at, period)
    const bucket = bucketMap.get(key)
    if (bucket) bucket.logins++
  }

  // Totals
  const totals = buckets.reduce((acc, b) => {
    const d = bucketMap.get(b)!
    return {
      revenue: acc.revenue + d.revenue,
      allPointsSpent: acc.allPointsSpent + d.allPointsSpent,
      payingPointsSpent: acc.payingPointsSpent + d.payingPointsSpent,
      registrations: acc.registrations + d.registrations,
      logins: acc.logins + d.logins,
    }
  }, { revenue: 0, allPointsSpent: 0, payingPointsSpent: 0, registrations: 0, logins: 0 })

  // Max values for bar scaling
  const maxRevenue = Math.max(...buckets.map(b => bucketMap.get(b)!.revenue), 1)
  const maxAllSpent = Math.max(...buckets.map(b => bucketMap.get(b)!.allPointsSpent), 1)
  const maxPayingSpent = Math.max(...buckets.map(b => bucketMap.get(b)!.payingPointsSpent), 1)
  const maxReg = Math.max(...buckets.map(b => bucketMap.get(b)!.registrations), 1)
  const maxLogins = Math.max(...buckets.map(b => bucketMap.get(b)!.logins), 1)

  const periodTabs: { value: Period; label: string }[] = [
    { value: 'hourly', label: '時間別（直近24時間）' },
    { value: 'daily', label: '日別（直近30日）' },
    { value: 'monthly', label: '月別（直近12ヶ月）' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">集計</h1>
      </div>

      {/* Period tabs */}
      <div className="flex gap-2">
        {periodTabs.map(tab => (
          <Link
            key={tab.value}
            href={`?period=${tab.value}`}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              period === tab.value
                ? 'bg-[var(--color-primary)] text-white'
                : 'glass text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: '課金額', value: `¥${totals.revenue.toLocaleString()}`, color: '#10b981' },
          { label: 'ポイント消費（全体）', value: `${totals.allPointsSpent.toLocaleString()}T`, color: '#6366f1' },
          { label: 'ポイント消費（課金ユーザー）', value: `${totals.payingPointsSpent.toLocaleString()}T`, color: '#8b5cf6' },
          { label: '新規登録', value: `${totals.registrations}人`, color: '#f59e0b' },
          { label: 'ログイン', value: `${totals.logins}人`, color: '#3b82f6' },
        ].map(card => (
          <div key={card.label} className="glass rounded-xl px-4 py-3">
            <p className="text-[var(--color-text-muted)] text-xs mb-1">{card.label}</p>
            <p className="text-xl font-bold" style={{ color: card.color }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      {[
        { label: '課金額（円）', key: 'revenue' as const, max: maxRevenue, color: '#10b981', fmt: (v: number) => `¥${v.toLocaleString()}` },
        { label: 'ポイント消費・全ユーザー', key: 'allPointsSpent' as const, max: maxAllSpent, color: '#6366f1', fmt: (v: number) => `${v}T` },
        { label: 'ポイント消費・課金ユーザー', key: 'payingPointsSpent' as const, max: maxPayingSpent, color: '#8b5cf6', fmt: (v: number) => `${v}T` },
        { label: '新規登録者数', key: 'registrations' as const, max: maxReg, color: '#f59e0b', fmt: (v: number) => `${v}人` },
        { label: 'ログイン数', key: 'logins' as const, max: maxLogins, color: '#3b82f6', fmt: (v: number) => `${v}人` },
      ].map(chart => (
        <div key={chart.key} className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-4 text-[var(--color-text-muted)]">{chart.label}</h2>
          <div className="flex items-end gap-px" style={{ height: 80 }}>
            {buckets.map(bucket => {
              const val = bucketMap.get(bucket)![chart.key]
              const pct = chart.max > 0 ? (val / chart.max) * 100 : 0
              return (
                <div
                  key={bucket}
                  className="flex-1 flex flex-col justify-end group relative"
                  style={{ minWidth: 0 }}
                >
                  <div
                    style={{
                      height: `${Math.max(pct, val > 0 ? 2 : 0)}%`,
                      background: chart.color,
                      opacity: 0.8,
                      borderRadius: '2px 2px 0 0',
                      minHeight: val > 0 ? 2 : 0,
                    }}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 pointer-events-none">
                    <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded px-2 py-1 text-xs whitespace-nowrap">
                      <div className="text-[var(--color-text-muted)]">{formatBucketLabel(bucket, period)}</div>
                      <div className="font-semibold">{chart.fmt(val)}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {/* X-axis labels: show only first, middle, last */}
          <div className="flex justify-between mt-1 text-[10px] text-[var(--color-text-muted)]">
            <span>{formatBucketLabel(buckets[0], period)}</span>
            <span>{formatBucketLabel(buckets[Math.floor(buckets.length / 2)], period)}</span>
            <span>{formatBucketLabel(buckets[buckets.length - 1], period)}</span>
          </div>
        </div>
      ))}

      {/* Data table */}
      <div className="glass rounded-2xl p-5">
        <h2 className="text-sm font-semibold mb-4 text-[var(--color-text-muted)]">詳細データ</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--color-text-muted)] text-xs border-b border-[var(--color-border)]">
                <th className="text-left pb-2 pr-4">期間</th>
                <th className="text-right pb-2 px-4">課金額</th>
                <th className="text-right pb-2 px-4">消費(全体)</th>
                <th className="text-right pb-2 px-4">消費(課金)</th>
                <th className="text-right pb-2 px-4">登録</th>
                <th className="text-right pb-2 pl-4">ログイン</th>
              </tr>
            </thead>
            <tbody>
              {[...buckets].reverse().map(bucket => {
                const d = bucketMap.get(bucket)!
                const hasData = d.revenue > 0 || d.allPointsSpent > 0 || d.registrations > 0 || d.logins > 0
                return (
                  <tr key={bucket} className={`border-b border-[var(--color-border)]/40 ${!hasData ? 'opacity-30' : ''}`}>
                    <td className="py-1.5 pr-4 font-mono text-xs text-[var(--color-text-muted)]">{formatBucketLabel(bucket, period)}</td>
                    <td className="py-1.5 px-4 text-right text-green-400 font-medium">{d.revenue > 0 ? `¥${d.revenue.toLocaleString()}` : '—'}</td>
                    <td className="py-1.5 px-4 text-right">{d.allPointsSpent > 0 ? `${d.allPointsSpent}T` : '—'}</td>
                    <td className="py-1.5 px-4 text-right">{d.payingPointsSpent > 0 ? `${d.payingPointsSpent}T` : '—'}</td>
                    <td className="py-1.5 px-4 text-right">{d.registrations > 0 ? `${d.registrations}人` : '—'}</td>
                    <td className="py-1.5 pl-4 text-right">{d.logins > 0 ? `${d.logins}人` : '—'}</td>
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
