import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Search, MessageSquare, FileText } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

type SearchParams = {
  keyword?: string
  character_id?: string
  unread?: string
  has_note?: string
  last_msg_from?: string
  last_msg_to?: string
  user_code?: string
  user_name?: string
  gender?: string
  age_min?: string
  age_max?: string
  points_min?: string
  points_max?: string
  sort?: string
  order?: string
}

const GENDER_LABEL: Record<string, string> = {
  male: '男性',
  female: '女性',
  other: 'その他',
}

export default async function AdminConversationsSearchPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = createClient()

  const { data: characters } = await supabase
    .from('characters')
    .select('id, name')
    .order('name')

  const isSearching = Object.entries(searchParams).some(
    ([k, v]) => k !== 'sort' && k !== 'order' && v,
  )

  let conversations: any[] = []
  let error: string | null = null

  if (isSearching) {
    let noResults = false

    // ── Step 1: プロフィール絞り込み → user_ids ──────────────────
    const hasProfileFilter =
      searchParams.user_code?.trim() ||
      searchParams.user_name?.trim() ||
      searchParams.gender ||
      searchParams.age_min ||
      searchParams.age_max ||
      searchParams.points_min ||
      searchParams.points_max

    let profileUserIds: string[] | null = null

    if (hasProfileFilter) {
      let pq = supabase.from('profiles').select('id')
      if (searchParams.user_code?.trim())
        pq = pq.ilike('user_code', `%${searchParams.user_code.trim()}%`)
      if (searchParams.user_name?.trim())
        pq = pq.ilike('display_name', `%${searchParams.user_name.trim()}%`)
      if (searchParams.gender) pq = pq.eq('gender', searchParams.gender)
      if (searchParams.age_min) pq = pq.gte('age', parseInt(searchParams.age_min))
      if (searchParams.age_max) pq = pq.lte('age', parseInt(searchParams.age_max))
      if (searchParams.points_min) pq = pq.gte('points', parseInt(searchParams.points_min))
      if (searchParams.points_max) pq = pq.lte('points', parseInt(searchParams.points_max))
      const { data: profiles } = await pq.limit(500)
      profileUserIds = profiles?.map((p) => p.id) ?? []
      if (profileUserIds.length === 0) noResults = true
    }

    // ── Step 2: メッセージキーワード → conversation_ids ───────────
    let keywordConvIds: string[] | null = null

    if (!noResults && searchParams.keyword?.trim()) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('conversation_id')
        .ilike('content', `%${searchParams.keyword.trim()}%`)
        .limit(500)
      keywordConvIds = [...new Set(msgs?.map((m) => m.conversation_id) ?? [])]
      if (keywordConvIds.length === 0) noResults = true
    }

    // ── Step 3: 会話クエリ ────────────────────────────────────────
    if (!noResults) {
      let query = supabase.from('conversations').select(`
        id,
        last_message_at,
        is_unread_staff,
        staff_note,
        characters ( id, name, avatar_url ),
        profiles ( id, user_code, display_name, email, age, gender, points )
      `)

      if (searchParams.unread === 'unread') query = query.eq('is_unread_staff', true)
      if (searchParams.unread === 'read') query = query.eq('is_unread_staff', false)
      if (searchParams.has_note === '1')
        query = query.not('staff_note', 'is', null).neq('staff_note', '')
      if (searchParams.character_id) query = query.eq('character_id', searchParams.character_id)
      if (searchParams.last_msg_from) query = query.gte('last_message_at', searchParams.last_msg_from)
      if (searchParams.last_msg_to)
        query = query.lte('last_message_at', `${searchParams.last_msg_to}T23:59:59`)
      if (profileUserIds !== null) query = query.in('user_id', profileUserIds)
      if (keywordConvIds !== null) query = query.in('id', keywordConvIds)

      const sortCol = searchParams.sort ?? 'last_message_at'
      const sortAsc = searchParams.order === 'asc'
      query = query.order(sortCol, { ascending: sortAsc }).limit(100)

      const { data, error: qErr } = await query
      if (qErr) error = qErr.message
      conversations = data ?? []
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">やり取り検索</h1>
        <p className="text-[var(--color-text-muted)] text-sm">最大100件表示</p>
      </div>

      {/* 検索フォーム */}
      <form method="GET" className="glass rounded-2xl p-5 mb-6 space-y-4">

        {/* メッセージキーワード */}
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">メッセージ内キーワード</label>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              name="keyword"
              defaultValue={searchParams.keyword}
              placeholder="会話の中のテキストで絞り込み"
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        {/* キャラクター・返信状況 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">キャラクター</label>
            <select
              name="character_id"
              defaultValue={searchParams.character_id ?? ''}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              <option value="">すべて</option>
              {characters?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">返信状況</label>
            <select
              name="unread"
              defaultValue={searchParams.unread ?? ''}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              <option value="">すべて</option>
              <option value="unread">未返信のみ</option>
              <option value="read">返信済のみ</option>
            </select>
          </div>
        </div>

        {/* スタッフメモ・最終メッセージ日時 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">スタッフメモ</label>
            <select
              name="has_note"
              defaultValue={searchParams.has_note ?? ''}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              <option value="">すべて</option>
              <option value="1">メモあり</option>
            </select>
          </div>
          <div />
        </div>

        {/* 最終メッセージ日時 */}
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">最終メッセージ日時</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              name="last_msg_from"
              defaultValue={searchParams.last_msg_from}
              className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
            <span className="text-[var(--color-text-muted)] text-xs">〜</span>
            <input
              type="date"
              name="last_msg_to"
              defaultValue={searchParams.last_msg_to}
              className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        {/* セパレーター */}
        <div className="border-t border-[var(--color-border)] pt-3">
          <p className="text-xs text-[var(--color-text-muted)] mb-3 font-medium">ユーザー条件</p>
        </div>

        {/* ユーザーID・名前 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">ユーザーID</label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                name="user_code"
                defaultValue={searchParams.user_code}
                placeholder="12345"
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">ユーザー名</label>
            <input
              type="text"
              name="user_name"
              defaultValue={searchParams.user_name}
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
              name="gender"
              defaultValue={searchParams.gender ?? ''}
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
              type="number"
              name="age_min"
              defaultValue={searchParams.age_min}
              placeholder="例: 20"
              min="0"
              max="120"
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">年齢（以下）</label>
            <input
              type="number"
              name="age_max"
              defaultValue={searchParams.age_max}
              placeholder="例: 30"
              min="0"
              max="120"
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        {/* 残ポイント */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">残ポイント（以上）</label>
            <input
              type="number"
              name="points_min"
              defaultValue={searchParams.points_min}
              placeholder="例: 10"
              min="0"
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">残ポイント（以下）</label>
            <input
              type="number"
              name="points_max"
              defaultValue={searchParams.points_max}
              placeholder="例: 100"
              min="0"
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        {/* ソート */}
        <div className="border-t border-[var(--color-border)] pt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">並び順</label>
            <select
              name="sort"
              defaultValue={searchParams.sort ?? 'last_message_at'}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              <option value="last_message_at">最終メッセージ日時</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">昇順 / 降順</label>
            <select
              name="order"
              defaultValue={searchParams.order ?? 'desc'}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              <option value="desc">新しい順（降順）</option>
              <option value="asc">古い順（昇順）</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button type="submit" className="btn-primary px-5 py-2 text-sm">
            検索
          </button>
          {isSearching && (
            <a href="/admin/conversations/search" className="btn-ghost px-5 py-2 text-sm">
              リセット
            </a>
          )}
        </div>
      </form>

      {/* 検索前の案内 */}
      {!isSearching && (
        <div className="text-center py-20 text-[var(--color-text-muted)]">
          <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">条件を入力して検索してください</p>
        </div>
      )}

      {/* 件数 */}
      {isSearching && (
        <div className="text-xs text-[var(--color-text-muted)] mb-3">
          {conversations.length}件
          {conversations.length === 100 && '（上限100件）'}
        </div>
      )}

      {error && (
        <div className="text-red-400 text-sm mb-4">エラー: {error}</div>
      )}

      {/* 結果一覧 */}
      {isSearching && (
        <div className="space-y-2">
          {conversations.map((conv: any) => {
            const profile = conv.profiles
            const character = conv.characters
            return (
              <Link
                key={conv.id}
                href={`/admin/conversations/${conv.id}`}
                className={`block glass rounded-xl px-5 py-4 hover:border-[var(--color-primary-light)]/40 transition-all ${
                  conv.is_unread_staff
                    ? 'border-[var(--color-primary)]/40 ring-1 ring-[var(--color-primary)]/20'
                    : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* キャラアバター */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-[var(--color-border)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={character?.avatar_url}
                        alt={character?.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {conv.is_unread_staff && (
                      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-400 border-2 border-[var(--color-bg)]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* 1行目: ユーザー名 + ID + キャラ名 */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          {profile?.display_name || profile?.email || '匿名ユーザー'}
                        </span>
                        {profile?.user_code && (
                          <span className="font-mono text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded">
                            {profile.user_code}
                          </span>
                        )}
                        {profile?.gender && (
                          <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded">
                            {GENDER_LABEL[profile.gender]}
                          </span>
                        )}
                        {profile?.age != null && (
                          <span className="text-xs text-[var(--color-text-muted)]">{profile.age}歳</span>
                        )}
                        <span className="text-xs text-[var(--color-text-muted)]">→ {character?.name}</span>
                      </div>
                      <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">
                        {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: ja })}
                      </span>
                    </div>

                    {/* 2行目: メモ + ポイント + 未読バッジ */}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-[var(--color-text-muted)]">
                        残り: {profile?.points ?? 0}T
                      </span>
                      {conv.staff_note && (
                        <span className="flex items-center gap-1 text-xs text-amber-400">
                          <FileText size={11} />
                          メモあり
                        </span>
                      )}
                      {conv.is_unread_staff && (
                        <span className="text-xs text-red-400 font-medium">● 未返信</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}

          {conversations.length === 0 && (
            <div className="text-center py-20 text-[var(--color-text-muted)]">
              <p>該当するやり取りがありません</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
