import { createClient as createAdminClient } from '@supabase/supabase-js'
import { unstable_noStore as noStore } from 'next/cache'
import KpiAdInputs from './KpiAdInputs'

function adminDb() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function pct(num: number, den: number) {
  if (den === 0) return null
  return Math.round((num / den) * 1000) / 10
}

function yen(n: number) {
  return `¥${Math.round(n).toLocaleString()}`
}

function MetricCard({
  label, value, sub, color = '#2563eb',
}: {
  label: string; value: string | null; sub?: string; color?: string
}) {
  return (
    <div className="glass rounded-xl p-5">
      <p className="text-xs text-[var(--color-text-muted)] mb-2">{label}</p>
      {value != null ? (
        <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      ) : (
        <p className="text-lg font-semibold text-[var(--color-text-muted)]">—</p>
      )}
      {sub && <p className="text-xs text-[var(--color-text-muted)] mt-1">{sub}</p>}
    </div>
  )
}

export default async function KpiPage() {
  noStore()
  const db = adminDb()

  // テストラベルのIDを先に取得
  const { data: testLabel } = await db
    .from('admin_labels')
    .select('id')
    .ilike('name', '%テスト%')
    .limit(10)

  const testLabelIds = (testLabel ?? []).map(l => l.id)

  // テストラベルが貼られたユーザーIDを取得
  let testUserIds: Set<string> = new Set()
  if (testLabelIds.length > 0) {
    const { data: testAssignments } = await db
      .from('user_label_assignments')
      .select('user_id')
      .in('label_id', testLabelIds)
    testUserIds = new Set((testAssignments ?? []).map(a => a.user_id))
  }

  const [
    { data: allUsers },
    { data: purchases },
    { data: spends },
  ] = await Promise.all([
    db.from('profiles')
      .select('id, created_at')
      .not('role', 'in', '(admin,staff)'),

    // price_yen > 0 のみ = 実際のStripe課金のみ（ボーナス付与を除外）
    db.from('point_transactions')
      .select('user_id, price_yen, created_at')
      .eq('type', 'purchase')
      .gt('price_yen', 0)
      .order('created_at', { ascending: true }),

    db.from('point_transactions')
      .select('user_id, created_at')
      .eq('type', 'spend')
      .order('created_at', { ascending: true }),
  ])

  const totalUsers = (allUsers ?? []).filter(u => !testUserIds.has(u.id)).length
  // テストユーザーとスタッフを除外したIDセット
  const userIdSet = new Set(
    (allUsers ?? [])
      .filter(u => !testUserIds.has(u.id))
      .map(u => u.id)
  )

  // ── 課金計算 ──────────────────────────────────────────
  const purchasesByUser = new Map<string, { price_yen: number; created_at: string }[]>()
  for (const tx of purchases ?? []) {
    if (!userIdSet.has(tx.user_id)) continue
    if (!purchasesByUser.has(tx.user_id)) purchasesByUser.set(tx.user_id, [])
    purchasesByUser.get(tx.user_id)!.push(tx)
  }

  const usersWithPurchase = purchasesByUser.size
  const firstPurchaseRate = pct(usersWithPurchase, totalUsers)

  let firstPurchaseTotal = 0, firstPurchaseCount = 0
  let totalPurchaseCount = 0
  for (const txList of purchasesByUser.values()) {
    const first = txList[0]
    if (first.price_yen != null && first.price_yen > 0) {
      firstPurchaseTotal += first.price_yen
      firstPurchaseCount++
    }
    totalPurchaseCount += txList.length
  }
  const avgFirstPurchase = firstPurchaseCount > 0 ? firstPurchaseTotal / firstPurchaseCount : null
  const avgPurchaseCount = usersWithPurchase > 0 ? totalPurchaseCount / usersWithPurchase : null

  let repurchaseCount = 0
  for (const txList of purchasesByUser.values()) {
    if (txList.length >= 2) repurchaseCount++
  }
  const repurchaseRate = pct(repurchaseCount, usersWithPurchase)

  const totalRevenue = (purchases ?? [])
    .filter(t => userIdSet.has(t.user_id))
    .reduce((s, t) => s + (t.price_yen ?? 0), 0)
  const revenuePerUser = totalUsers > 0 ? totalRevenue / totalUsers : null

  // ARPPU（課金ユーザーあたり売上）
  const arppu = usersWithPurchase > 0 ? totalRevenue / usersWithPurchase : null

  // LTV概算 = ARPPU × (1 / (1 - 再購入率)) — 再購入率を用いたシンプルな近似
  const repurchaseRateRaw = usersWithPurchase > 0 ? repurchaseCount / usersWithPurchase : 0
  const ltv = arppu != null && repurchaseRateRaw < 1
    ? arppu / (1 - repurchaseRateRaw)
    : null

  // ── 継続計算 ──────────────────────────────────────────
  const now = Date.now()
  const DAY = 86400000

  // userIdSet でフィルター済み（テスト・スタッフ除外）
  const userCreatedAt = new Map(
    (allUsers ?? [])
      .filter(u => userIdSet.has(u.id))
      .map(u => [u.id, new Date(u.created_at).getTime()])
  )

  // 各ユーザーの最初・最後のspend時刻
  const firstSpendAt = new Map<string, number>()
  const lastSpendAt  = new Map<string, number>()
  for (const tx of spends ?? []) {
    if (!userIdSet.has(tx.user_id)) continue
    const t = new Date(tx.created_at).getTime()
    const first = firstSpendAt.get(tx.user_id)
    if (first == null || t < first) firstSpendAt.set(tx.user_id, t)
    const last = lastSpendAt.get(tx.user_id)
    if (last == null || t > last) lastSpendAt.set(tx.user_id, t)
  }

  let users1dAgo = 0,  retained1d = 0
  let users3dAgo = 0,  retained3d = 0
  let users7dAgo = 0,  retained7d = 0
  let users30dAgo = 0, retained30d = 0

  // 登録→初メッセージ率
  let usersWithAnySpend = 0

  for (const [uid, createdMs] of userCreatedAt) {
    const ageMs = now - createdMs
    const lastSpend = lastSpendAt.get(uid)
    if (firstSpendAt.has(uid)) usersWithAnySpend++

    // 継続率の定義:「登録N日以降も使い続けたか」
    // = 最後のspendが 登録時刻 + N日 以降かどうか
    if (ageMs >= 1 * DAY) {
      users1dAgo++
      if (lastSpend != null && lastSpend - createdMs >= 1 * DAY) retained1d++
    }
    if (ageMs >= 3 * DAY) {
      users3dAgo++
      if (lastSpend != null && lastSpend - createdMs >= 3 * DAY) retained3d++
    }
    if (ageMs >= 7 * DAY) {
      users7dAgo++
      if (lastSpend != null && lastSpend - createdMs >= 7 * DAY) retained7d++
    }
    if (ageMs >= 30 * DAY) {
      users30dAgo++
      if (lastSpend != null && lastSpend - createdMs >= 30 * DAY) retained30d++
    }
  }

  const retention1d  = pct(retained1d,  users1dAgo)
  const retention3d  = pct(retained3d,  users3dAgo)
  const retention7d  = pct(retained7d,  users7dAgo)
  const retention30d = pct(retained30d, users30dAgo)
  const firstMsgRate = pct(usersWithAnySpend, totalUsers)

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">KPIサマリー</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          全期間累計 · {totalUsers.toLocaleString()}ユーザー（スタッフ・テストラベル除く
          {testUserIds.size > 0 ? `、${testUserIds.size}人除外` : ''}）
        </p>
      </div>

      {/* ファネル */}
      <div>
        <h2 className="text-xs font-semibold text-[var(--color-text-muted)] mb-3 uppercase tracking-wide">ファネル</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricCard
            label="登録→初メッセージ率"
            value={firstMsgRate != null ? `${firstMsgRate}%` : null}
            sub={`${usersWithAnySpend}人 / ${totalUsers}人がチャット開始`}
            color="#3b82f6"
          />
          <MetricCard
            label="初回課金率"
            value={firstPurchaseRate != null ? `${firstPurchaseRate}%` : null}
            sub={`${usersWithPurchase}人 / ${totalUsers}人が課金`}
            color="#10b981"
          />
          <MetricCard
            label="チャージ再購入率"
            value={repurchaseRate != null ? `${repurchaseRate}%` : null}
            sub={`課金者${usersWithPurchase}人中${repurchaseCount}人が2回以上`}
            color="#6366f1"
          />
        </div>
      </div>

      {/* 課金 */}
      <div>
        <h2 className="text-xs font-semibold text-[var(--color-text-muted)] mb-3 uppercase tracking-wide">課金</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="初回購入単価"
            value={avgFirstPurchase != null ? yen(avgFirstPurchase) : null}
            sub={`${firstPurchaseCount}件の初回課金`}
            color="#10b981"
          />
          <MetricCard
            label="ARPPU（課金者あたり売上）"
            value={arppu != null ? yen(arppu) : null}
            sub={`総売上 ${yen(totalRevenue)} / ${usersWithPurchase}人`}
            color="#10b981"
          />
          <MetricCard
            label="平均課金回数"
            value={avgPurchaseCount != null ? `${Math.round(avgPurchaseCount * 10) / 10}回` : null}
            sub={`課金者${usersWithPurchase}人 合計${totalPurchaseCount}回`}
            color="#6366f1"
          />
          <MetricCard
            label="LTV概算"
            value={ltv != null ? yen(ltv) : null}
            sub="ARPPU ÷ (1 - 再購入率) で近似"
            color="#6366f1"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <MetricCard
            label="1ユーザーあたり売上"
            value={revenuePerUser != null ? yen(revenuePerUser) : null}
            sub={`総売上 ${yen(totalRevenue)} / ${totalUsers}人`}
            color="#8b5cf6"
          />
          <MetricCard label="返金率" value="0%" sub="返金はStripe管理画面で確認" color="#6b7280" />
        </div>
      </div>

      {/* 継続 */}
      <div>
        <h2 className="text-xs font-semibold text-[var(--color-text-muted)] mb-3 uppercase tracking-wide">継続率（登録からN日以内に初メッセージ送信）</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="D1継続率"
            value={retention1d != null ? `${retention1d}%` : null}
            sub={`対象 ${users1dAgo}人 / 継続 ${retained1d}人`}
            color="#f59e0b"
          />
          <MetricCard
            label="D3継続率"
            value={retention3d != null ? `${retention3d}%` : null}
            sub={`対象 ${users3dAgo}人 / 継続 ${retained3d}人`}
            color="#f59e0b"
          />
          <MetricCard
            label="7日継続率"
            value={retention7d != null ? `${retention7d}%` : null}
            sub={`対象 ${users7dAgo}人 / 継続 ${retained7d}人`}
            color="#f59e0b"
          />
          <MetricCard
            label="30日継続率"
            value={retention30d != null ? `${retention30d}%` : null}
            sub={`対象 ${users30dAgo}人 / 継続 ${retained30d}人`}
            color="#f59e0b"
          />
        </div>
      </div>

      {/* 広告・LP指標 */}
      <div>
        <h2 className="text-xs font-semibold text-[var(--color-text-muted)] mb-3 uppercase tracking-wide">
          広告・LP指標（広告費を入力）
        </h2>
        <KpiAdInputs totalUsers={totalUsers} totalRevenue={totalRevenue} />
      </div>
    </div>
  )
}
