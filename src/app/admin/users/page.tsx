import { createClient } from '@/lib/supabase/server'
import { Search } from 'lucide-react'

type SearchParams = {
  user_code?: string
  name?: string
  gender?: string
  age_min?: string
  age_max?: string
  points_min?: string
  points_max?: string
  charged_min?: string
  charged_max?: string
  registered_from?: string
  registered_to?: string
  login_from?: string
  login_to?: string
  payment_from?: string
  payment_to?: string
  sort?: string
  order?: string
}

const GENDER_LABEL: Record<string, string> = {
  male: '男性',
  female: '女性',
  other: 'その他',
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = createClient()

  let query = supabase
    .from('admin_users_view')
    .select('id, user_code, email, display_name, age, gender, points, total_charged, last_login_at, last_payment_at, created_at')

  // テキスト検索
  if (searchParams.user_code?.trim()) {
    query = query.ilike('user_code', `%${searchParams.user_code.trim()}%`)
  }
  if (searchParams.name?.trim()) {
    query = query.ilike('display_name', `%${searchParams.name.trim()}%`)
  }

  // 性別
  if (searchParams.gender) {
    query = query.eq('gender', searchParams.gender)
  }

  // 年齢範囲
  if (searchParams.age_min) query = query.gte('age', parseInt(searchParams.age_min))
  if (searchParams.age_max) query = query.lte('age', parseInt(searchParams.age_max))

  // 所有ポイント範囲
  if (searchParams.points_min) query = query.gte('points', parseInt(searchParams.points_min))
  if (searchParams.points_max) query = query.lte('points', parseInt(searchParams.points_max))

  // 課金額範囲
  if (searchParams.charged_min) query = query.gte('total_charged', parseInt(searchParams.charged_min))
  if (searchParams.charged_max) query = query.lte('total_charged', parseInt(searchParams.charged_max))

  // 登録日時
  if (searchParams.registered_from) query = query.gte('created_at', searchParams.registered_from)
  if (searchParams.registered_to) query = query.lte('created_at', `${searchParams.registered_to}T23:59:59`)

  // 最終ログイン日時
  if (searchParams.login_from) query = query.gte('last_login_at', searchParams.login_from)
  if (searchParams.login_to) query = query.lte('last_login_at', `${searchParams.login_to}T23:59:59`)

  // 最終入金日時
  if (searchParams.payment_from) query = query.gte('last_payment_at', searchParams.payment_from)
  if (searchParams.payment_to) query = query.lte('last_payment_at', `${searchParams.payment_to}T23:59:59`)

  // ソート
  const sortCol = searchParams.sort ?? 'created_at'
  const sortAsc = searchParams.order === 'asc'
  query = query.order(sortCol, { ascending: sortAsc }).limit(100)

  const { data: users, error } = await query

  const hasFilters = Object.entries(searchParams).some(([k, v]) => k !== 'sort' && k !== 'order' && v)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">ユーザー管理</h1>
        <p className="text-[var(--color-text-muted)] text-sm">最大100件表示</p>
      </div>

      {/* 検索フォーム */}
      <form method="GET" className="glass rounded-2xl p-5 mb-6 space-y-4">
        {/* テキスト検索 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">ユーザーID</label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text" name="user_code" defaultValue={searchParams.user_code}
                placeholder="12345"
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">名前</label>
            <input
              type="text" name="name" defaultValue={searchParams.name}
              placeholder="ニックネーム"
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        {/* 性別・年齢 */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">性別</label>
            <select
              name="gender" defaultValue={searchParams.gender ?? ''}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              <option value="">すべて</option>
              <option value="male">男性</option>
              <option value="female">女性</option>
              <option value="other">その他</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">年齢（以上）</label>
            <input
              type="number" name="age_min" defaultValue={searchParams.age_min}
              placeholder="例: 20" min="0" max="120"
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">年齢（以下）</label>
            <input
              type="number" name="age_max" defaultValue={searchParams.age_max}
              placeholder="例: 30" min="0" max="120"
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        {/* 登録日時 */}
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">登録日時</label>
          <div className="flex items-center gap-2">
            <input
              type="date" name="registered_from" defaultValue={searchParams.registered_from}
              className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
            <span className="text-[var(--color-text-muted)] text-xs">〜</span>
            <input
              type="date" name="registered_to" defaultValue={searchParams.registered_to}
              className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        {/* 最終ログイン日時 */}
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">最終ログイン日時</label>
          <div className="flex items-center gap-2">
            <input
              type="date" name="login_from" defaultValue={searchParams.login_from}
              className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
            <span className="text-[var(--color-text-muted)] text-xs">〜</span>
            <input
              type="date" name="login_to" defaultValue={searchParams.login_to}
              className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        {/* 所有ポイント */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">所有ポイント（以上）</label>
            <input
              type="number" name="points_min" defaultValue={searchParams.points_min}
              placeholder="例: 10" min="0"
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">所有ポイント（以下）</label>
            <input
              type="number" name="points_max" defaultValue={searchParams.points_max}
              placeholder="例: 100" min="0"
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        {/* 課金額・最終入金 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">課金額（以上）</label>
            <input
              type="number" name="charged_min" defaultValue={searchParams.charged_min}
              placeholder="例: 1000" min="0"
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">課金額（以下）</label>
            <input
              type="number" name="charged_max" defaultValue={searchParams.charged_max}
              placeholder="例: 10000" min="0"
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        {/* 最終入金日時 */}
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">最終入金日時</label>
          <div className="flex items-center gap-2">
            <input
              type="date" name="payment_from" defaultValue={searchParams.payment_from}
              className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
            <span className="text-[var(--color-text-muted)] text-xs">〜</span>
            <input
              type="date" name="payment_to" defaultValue={searchParams.payment_to}
              className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        {/* ソート */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">並び順</label>
            <select
              name="sort" defaultValue={searchParams.sort ?? 'created_at'}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              <option value="created_at">登録日時</option>
              <option value="last_login_at">最終ログイン</option>
              <option value="last_payment_at">最終入金</option>
              <option value="points">所有ポイント</option>
              <option value="total_charged">課金額</option>
              <option value="age">年齢</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">昇順 / 降順</label>
            <select
              name="order" defaultValue={searchParams.order ?? 'desc'}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              <option value="desc">新しい順（降順）</option>
              <option value="asc">古い順（昇順）</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            className="btn-primary px-5 py-2 text-sm"
          >
            検索
          </button>
          {hasFilters && (
            <a href="/admin/users" className="btn-ghost px-5 py-2 text-sm">
              リセット
            </a>
          )}
        </div>
      </form>

      {/* 件数 */}
      <div className="text-xs text-[var(--color-text-muted)] mb-3">
        {users?.length ?? 0}件
        {(users?.length ?? 0) === 100 && '（上限100件）'}
      </div>

      {/* 結果テーブル */}
      {error && (
        <div className="text-red-400 text-sm mb-4">エラー: {error.message}</div>
      )}

      <div className="space-y-2">
        {users?.map((user) => (
          <div key={user.id} className="glass rounded-xl px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                {/* 1行目: ID・名前・性別・年齢 */}
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-sm font-semibold text-[var(--color-primary-light)]">
                    {user.user_code}
                  </span>
                  <span className="text-sm font-medium">
                    {user.display_name ?? '—'}
                  </span>
                  {user.gender && (
                    <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded">
                      {GENDER_LABEL[user.gender]}
                    </span>
                  )}
                  {user.age != null && (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {user.age}歳
                    </span>
                  )}
                </div>
                {/* 2行目: メール */}
                <div className="text-xs text-[var(--color-text-muted)] truncate mb-2">
                  {user.email}
                </div>
                {/* 3行目: 日時情報 */}
                <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)] flex-wrap">
                  <span>登録: {fmtDate(user.created_at)}</span>
                  <span>最終ログイン: {user.last_login_at ? fmtDate(user.last_login_at) : '—'}</span>
                  <span>最終入金: {user.last_payment_at ? fmtDate(user.last_payment_at) : '—'}</span>
                </div>
              </div>

              {/* 右側: ポイント・課金額 */}
              <div className="flex items-center gap-4 flex-shrink-0 text-right">
                <div>
                  <div className="text-sm font-semibold">{user.points}T</div>
                  <div className="text-xs text-[var(--color-text-muted)]">残高</div>
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    {user.total_charged > 0 ? `¥${user.total_charged.toLocaleString()}` : '—'}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">課金額</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(!users || users.length === 0) && (
        <div className="text-center py-20 text-[var(--color-text-muted)]">
          <p>該当するユーザーがいません</p>
        </div>
      )}
    </div>
  )
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
