import { createClient } from '@/lib/supabase/server'
import { Search, MessageSquare, FileText } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ConvQueueLink } from '@/components/admin/ConvQueueLink'

type SP = {
  // やり取り条件
  keyword?: string
  character_id?: string
  unread?: string
  has_note?: string
  last_msg_from?: string
  last_msg_to?: string
  // 送信日時条件
  user_sent_from?: string
  user_sent_to?: string
  op_sent_from?: string
  op_sent_to?: string
  // ユーザー条件
  user_code?: string
  user_name?: string
  gender?: string
  age_min?: string
  age_max?: string
  points_min?: string
  points_max?: string
  registered_from?: string
  registered_to?: string
  payment_from?: string
  payment_to?: string
  spend_from?: string
  spend_to?: string
  charged_min?: string
  charged_max?: string
  // 表示設定
  dedup?: string
  sort?: string
  order?: string
}

const GENDER_LABEL: Record<string, string> = {
  male: '男性', female: '女性', other: 'その他',
}

function intersectArrays(first: string[], ...rest: string[][]): string[] {
  const sets = rest.map(a => new Set(a))
  return first.filter(id => sets.every(s => s.has(id)))
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function buildPresetUrl(params: Record<string, string>): string {
  return `/admin/conversations/search?${new URLSearchParams(params)}`
}

export default async function AdminConversationsSearchPage({
  searchParams: sp,
}: {
  searchParams: SP
}) {
  const supabase = createClient()

  const { data: characters } = await supabase
    .from('characters').select('id, name').order('name')

  // プリセット定義（日付はサーバーサイドで計算）
  const PRESETS = [
    { label: '未返信3日以上', url: buildPresetUrl({ unread: 'unread', last_msg_to: daysAgo(3), sort: 'last_message_at', order: 'asc' }) },
    { label: 'ユーザー休眠14日', url: buildPresetUrl({ user_sent_to: daysAgo(14), sort: 'last_message_at', order: 'asc' }) },
    { label: '高課金（¥5,000+）', url: buildPresetUrl({ charged_min: '5000', sort: 'last_message_at', order: 'desc' }) },
    { label: '新規今週（重複なし）', url: buildPresetUrl({ registered_from: daysAgo(7), dedup: 'yes', sort: 'last_message_at', order: 'desc' }) },
    { label: 'ポイント切れ×未返信', url: buildPresetUrl({ points_max: '0', unread: 'unread' }) },
    { label: '今日のやり取り', url: buildPresetUrl({ last_msg_from: daysAgo(0), last_msg_to: daysAgo(0) }) },
    { label: 'スタッフメモあり', url: buildPresetUrl({ has_note: '1', sort: 'last_message_at', order: 'desc' }) },
    { label: 'OP未送信（3日）', url: buildPresetUrl({ op_sent_to: daysAgo(3), unread: 'unread', sort: 'last_message_at', order: 'asc' }) },
  ]

  const isSearching = Object.entries(sp).some(
    ([k, v]) => !['sort', 'order', 'dedup'].includes(k) && !!v,
  )

  let conversations: any[] = []
  let queryError: string | null = null

  if (isSearching) {
    let noResults = false

    // ================================================================
    // Step 1: ユーザーレベルフィルタ → user_ids
    // ================================================================
    const hasProfileFilter =
      sp.user_code?.trim() || sp.user_name?.trim() || sp.gender ||
      sp.age_min || sp.age_max || sp.points_min || sp.points_max ||
      sp.registered_from || sp.registered_to ||
      sp.payment_from || sp.payment_to ||
      sp.charged_min || sp.charged_max

    let profileIncludeIds: string[] | null = null
    if (hasProfileFilter) {
      let pq = supabase.from('admin_users_view').select('id')
      if (sp.user_code?.trim())       pq = pq.ilike('user_code', `%${sp.user_code.trim()}%`)
      if (sp.user_name?.trim())       pq = pq.ilike('display_name', `%${sp.user_name.trim()}%`)
      if (sp.gender)                  pq = pq.eq('gender', sp.gender)
      if (sp.age_min)                 pq = pq.gte('age', parseInt(sp.age_min))
      if (sp.age_max)                 pq = pq.lte('age', parseInt(sp.age_max))
      if (sp.points_min)              pq = pq.gte('points', parseInt(sp.points_min))
      if (sp.points_max)              pq = pq.lte('points', parseInt(sp.points_max))
      if (sp.registered_from)         pq = pq.gte('created_at', sp.registered_from)
      if (sp.registered_to)           pq = pq.lte('created_at', `${sp.registered_to}T23:59:59`)
      if (sp.payment_from)            pq = pq.gte('last_payment_at', sp.payment_from)
      if (sp.payment_to)              pq = pq.lte('last_payment_at', `${sp.payment_to}T23:59:59`)
      if (sp.charged_min)             pq = pq.gte('total_charged', parseInt(sp.charged_min))
      if (sp.charged_max)             pq = pq.lte('total_charged', parseInt(sp.charged_max))
      const { data } = await pq.limit(500)
      profileIncludeIds = data?.map(p => p.id) ?? []
      if (profileIncludeIds.length === 0) noResults = true
    }

    // 最終ポイント消費日時 → user_ids
    let spendIncludeIds: string[] | null = null
    let spendExcludeIds: Set<string> | null = null
    if (!noResults && sp.spend_from) {
      const { data } = await supabase.from('point_transactions')
        .select('user_id').eq('type', 'spend').gte('created_at', sp.spend_from).limit(500)
      spendIncludeIds = [...new Set(data?.map(t => t.user_id) ?? [])]
      if (spendIncludeIds.length === 0) noResults = true
    }
    if (!noResults && sp.spend_to) {
      const { data } = await supabase.from('point_transactions')
        .select('user_id').eq('type', 'spend').gt('created_at', `${sp.spend_to}T23:59:59`).limit(500)
      spendExcludeIds = new Set(data?.map(t => t.user_id) ?? [])
    }

    // user_ids を合成（積集合）
    const includeUserIdSets = [profileIncludeIds, spendIncludeIds].filter((s): s is string[] => s !== null)
    let finalUserIds: string[] | null = null
    if (!noResults && includeUserIdSets.length > 0) {
      finalUserIds = includeUserIdSets.length === 1
        ? includeUserIdSets[0]
        : intersectArrays(includeUserIdSets[0], ...includeUserIdSets.slice(1))
      if (finalUserIds.length === 0) noResults = true
    }

    // ================================================================
    // Step 2: メッセージレベルフィルタ → conv_ids
    // ================================================================
    const convIncludeSets: string[][] = []
    const convExcludeIds = new Set<string>()

    // キーワード
    if (!noResults && sp.keyword?.trim()) {
      const { data } = await supabase.from('messages')
        .select('conversation_id').ilike('content', `%${sp.keyword.trim()}%`).limit(500)
      const ids = [...new Set(data?.map(m => m.conversation_id) ?? [])]
      if (ids.length === 0) noResults = true
      else convIncludeSets.push(ids)
    }

    // ユーザー最終送信日時
    if (!noResults && sp.user_sent_from) {
      const { data } = await supabase.from('messages')
        .select('conversation_id').eq('sender_role', 'user').gte('created_at', sp.user_sent_from).limit(500)
      const ids = [...new Set(data?.map(m => m.conversation_id) ?? [])]
      if (ids.length === 0) noResults = true
      else convIncludeSets.push(ids)
    }
    if (!noResults && sp.user_sent_to) {
      // user_sent_to以降にユーザーメッセージがある会話を除外
      const { data } = await supabase.from('messages')
        .select('conversation_id').eq('sender_role', 'user')
        .gt('created_at', `${sp.user_sent_to}T23:59:59`).limit(1000)
      data?.forEach(m => convExcludeIds.add(m.conversation_id))
    }

    // OP最終送信日時
    if (!noResults && sp.op_sent_from) {
      const { data } = await supabase.from('messages')
        .select('conversation_id').eq('sender_role', 'character').gte('created_at', sp.op_sent_from).limit(500)
      const ids = [...new Set(data?.map(m => m.conversation_id) ?? [])]
      if (ids.length === 0) noResults = true
      else convIncludeSets.push(ids)
    }
    if (!noResults && sp.op_sent_to) {
      const { data } = await supabase.from('messages')
        .select('conversation_id').eq('sender_role', 'character')
        .gt('created_at', `${sp.op_sent_to}T23:59:59`).limit(1000)
      data?.forEach(m => convExcludeIds.add(m.conversation_id))
    }

    let finalConvIds: string[] | null = null
    if (!noResults && convIncludeSets.length > 0) {
      finalConvIds = convIncludeSets.length === 1
        ? convIncludeSets[0]
        : intersectArrays(convIncludeSets[0], ...convIncludeSets.slice(1))
      if (finalConvIds.length === 0) noResults = true
    }

    // ================================================================
    // Step 3: メインクエリ
    // ================================================================
    if (!noResults) {
      const fetchLimit = sp.dedup === 'yes' ? 500 : 100

      let query = supabase.from('conversations').select(`
        id, last_message_at, is_unread_staff, staff_note,
        characters ( id, name, avatar_url ),
        profiles ( id, user_code, display_name, email, age, gender, points )
      `)

      if (sp.unread === 'unread')  query = query.eq('is_unread_staff', true)
      if (sp.unread === 'read')    query = query.eq('is_unread_staff', false)
      if (sp.has_note === '1')     query = query.not('staff_note', 'is', null).neq('staff_note', '')
      if (sp.character_id)         query = query.eq('character_id', sp.character_id)
      if (sp.last_msg_from)        query = query.gte('last_message_at', sp.last_msg_from)
      if (sp.last_msg_to)          query = query.lte('last_message_at', `${sp.last_msg_to}T23:59:59`)
      if (finalUserIds !== null)   query = query.in('user_id', finalUserIds)
      if (finalConvIds !== null)   query = query.in('id', finalConvIds)

      const sortAsc = sp.order === 'asc'
      query = query.order('last_message_at', { ascending: sortAsc }).limit(fetchLimit)

      const { data, error: qErr } = await query
      if (qErr) { queryError = qErr.message }

      let results = data ?? []

      // 除外セット適用
      if (convExcludeIds.size > 0)
        results = results.filter(c => !convExcludeIds.has(c.id))
      if (spendExcludeIds && spendExcludeIds.size > 0)
        results = results.filter(c => !spendExcludeIds!.has((c as any).profiles?.id))

      // 重複なし：ユーザーごとに最も古いやり取り1件のみ残す
      if (sp.dedup === 'yes') {
        const oldestByUser = new Map<string, any>()
        for (const conv of results) {
          const uid = (conv as any).profiles?.id
          if (!uid) continue
          const existing = oldestByUser.get(uid)
          if (!existing || conv.last_message_at < existing.last_message_at)
            oldestByUser.set(uid, conv)
        }
        results = Array.from(oldestByUser.values())
        results.sort((a, b) =>
          sortAsc
            ? a.last_message_at.localeCompare(b.last_message_at)
            : b.last_message_at.localeCompare(a.last_message_at)
        )
        results = results.slice(0, 100)
      }

      conversations = results
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm border border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]'
  const labelCls = 'text-xs text-[var(--color-text-muted)] mb-1.5 block'
  const sectionCls = 'border-t border-[var(--color-border)] pt-4'
  const sectionTitleCls = 'text-xs font-semibold text-[var(--color-text-muted)] mb-3 tracking-wide uppercase'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">やり取り検索</h1>
        <p className="text-[var(--color-text-muted)] text-sm">最大100件表示</p>
      </div>

      {/* プリセット */}
      <div className="mb-4">
        <p className="text-xs text-[var(--color-text-muted)] mb-2">クイック検索</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(preset => (
            <Link
              key={preset.label}
              href={preset.url}
              className="px-3 py-1 rounded-full text-xs border border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
            >
              {preset.label}
            </Link>
          ))}
        </div>
      </div>

      {/* 検索フォーム */}
      <form method="GET" className="glass rounded-2xl p-5 mb-6 space-y-4">

        {/* ── やり取り条件 ── */}
        <div>
          <p className={sectionTitleCls}>やり取り条件</p>
          <div className="space-y-3">
            {/* キーワード */}
            <div>
              <label className={labelCls}>メッセージ内キーワード</label>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input type="text" name="keyword" defaultValue={sp.keyword}
                  placeholder="会話の中のテキストで絞り込み"
                  className={`${inputCls} pl-8`} />
              </div>
            </div>
            {/* キャラ・返信状況 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>キャラクター</label>
                <select name="character_id" defaultValue={sp.character_id ?? ''} className={inputCls}>
                  <option value="">すべて</option>
                  {characters?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>返信状況</label>
                <select name="unread" defaultValue={sp.unread ?? ''} className={inputCls}>
                  <option value="">すべて</option>
                  <option value="unread">未返信のみ</option>
                  <option value="read">返信済のみ</option>
                </select>
              </div>
            </div>
            {/* スタッフメモ */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>スタッフメモ</label>
                <select name="has_note" defaultValue={sp.has_note ?? ''} className={inputCls}>
                  <option value="">すべて</option>
                  <option value="1">メモあり</option>
                </select>
              </div>
            </div>
            {/* 最終メッセージ日時 */}
            <div>
              <label className={labelCls}>最終メッセージ日時</label>
              <div className="flex items-center gap-2">
                <input type="date" name="last_msg_from" defaultValue={sp.last_msg_from} className={inputCls} />
                <span className="text-[var(--color-text-muted)] text-xs flex-shrink-0">〜</span>
                <input type="date" name="last_msg_to" defaultValue={sp.last_msg_to} className={inputCls} />
              </div>
            </div>
          </div>
        </div>

        {/* ── 送信日時条件 ── */}
        <div className={sectionCls}>
          <p className={sectionTitleCls}>送信日時条件</p>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>ユーザー最終送信日時</label>
              <div className="flex items-center gap-2">
                <input type="date" name="user_sent_from" defaultValue={sp.user_sent_from} className={inputCls} />
                <span className="text-[var(--color-text-muted)] text-xs flex-shrink-0">〜</span>
                <input type="date" name="user_sent_to" defaultValue={sp.user_sent_to} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>OP最終送信日時</label>
              <div className="flex items-center gap-2">
                <input type="date" name="op_sent_from" defaultValue={sp.op_sent_from} className={inputCls} />
                <span className="text-[var(--color-text-muted)] text-xs flex-shrink-0">〜</span>
                <input type="date" name="op_sent_to" defaultValue={sp.op_sent_to} className={inputCls} />
              </div>
            </div>
          </div>
        </div>

        {/* ── ユーザー条件 ── */}
        <div className={sectionCls}>
          <p className={sectionTitleCls}>ユーザー条件</p>
          <div className="space-y-3">
            {/* ID・名前 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>ユーザーID</label>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input type="text" name="user_code" defaultValue={sp.user_code}
                    placeholder="12345" className={`${inputCls} pl-8`} />
                </div>
              </div>
              <div>
                <label className={labelCls}>ユーザー名</label>
                <input type="text" name="user_name" defaultValue={sp.user_name}
                  placeholder="ニックネーム" className={inputCls} />
              </div>
            </div>
            {/* 性別・年齢 */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>性別</label>
                <select name="gender" defaultValue={sp.gender ?? ''} className={inputCls}>
                  <option value="">すべて</option>
                  <option value="male">男性</option>
                  <option value="female">女性</option>
                  <option value="other">その他</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>年齢（以上）</label>
                <input type="number" name="age_min" defaultValue={sp.age_min}
                  placeholder="20" min="0" max="120" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>年齢（以下）</label>
                <input type="number" name="age_max" defaultValue={sp.age_max}
                  placeholder="40" min="0" max="120" className={inputCls} />
              </div>
            </div>
            {/* 残ポイント */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>残ポイント（以上）</label>
                <input type="number" name="points_min" defaultValue={sp.points_min}
                  placeholder="0" min="0" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>残ポイント（以下）</label>
                <input type="number" name="points_max" defaultValue={sp.points_max}
                  placeholder="100" min="0" className={inputCls} />
              </div>
            </div>
            {/* 総入金額 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>総入金額（以上）¥</label>
                <input type="number" name="charged_min" defaultValue={sp.charged_min}
                  placeholder="1000" min="0" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>総入金額（以下）¥</label>
                <input type="number" name="charged_max" defaultValue={sp.charged_max}
                  placeholder="50000" min="0" className={inputCls} />
              </div>
            </div>
            {/* 登録日時 */}
            <div>
              <label className={labelCls}>登録日時</label>
              <div className="flex items-center gap-2">
                <input type="date" name="registered_from" defaultValue={sp.registered_from} className={inputCls} />
                <span className="text-[var(--color-text-muted)] text-xs flex-shrink-0">〜</span>
                <input type="date" name="registered_to" defaultValue={sp.registered_to} className={inputCls} />
              </div>
            </div>
            {/* 最終入金日時 */}
            <div>
              <label className={labelCls}>最終入金日時</label>
              <div className="flex items-center gap-2">
                <input type="date" name="payment_from" defaultValue={sp.payment_from} className={inputCls} />
                <span className="text-[var(--color-text-muted)] text-xs flex-shrink-0">〜</span>
                <input type="date" name="payment_to" defaultValue={sp.payment_to} className={inputCls} />
              </div>
            </div>
            {/* 最終ポイント消費日時 */}
            <div>
              <label className={labelCls}>最終ポイント消費日時</label>
              <div className="flex items-center gap-2">
                <input type="date" name="spend_from" defaultValue={sp.spend_from} className={inputCls} />
                <span className="text-[var(--color-text-muted)] text-xs flex-shrink-0">〜</span>
                <input type="date" name="spend_to" defaultValue={sp.spend_to} className={inputCls} />
              </div>
            </div>
          </div>
        </div>

        {/* ── 表示設定 ── */}
        <div className={sectionCls}>
          <p className={sectionTitleCls}>表示設定</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>重複</label>
              <select name="dedup" defaultValue={sp.dedup ?? ''} className={inputCls}>
                <option value="">重複あり（全件）</option>
                <option value="yes">重複なし（ユーザーごと最古）</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>並び順</label>
              <select name="sort" defaultValue={sp.sort ?? 'last_message_at'} className={inputCls}>
                <option value="last_message_at">最終メッセージ日時</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>昇順 / 降順</label>
              <select name="order" defaultValue={sp.order ?? 'desc'} className={inputCls}>
                <option value="desc">新しい順</option>
                <option value="asc">古い順</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button type="submit" className="btn-primary px-5 py-2 text-sm">検索</button>
          {isSearching && (
            <a href="/admin/conversations/search" className="btn-ghost px-5 py-2 text-sm">リセット</a>
          )}
        </div>
      </form>

      {/* 検索前の案内 */}
      {!isSearching && (
        <div className="text-center py-20 text-[var(--color-text-muted)]">
          <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">条件を入力するか、クイック検索を使ってください</p>
        </div>
      )}

      {/* 件数 */}
      {isSearching && (
        <div className="text-xs text-[var(--color-text-muted)] mb-3">
          {conversations.length}件
          {conversations.length === 100 && '（上限100件）'}
          {sp.dedup === 'yes' && ' · 重複なし'}
        </div>
      )}

      {queryError && (
        <div className="text-red-400 text-sm mb-4">エラー: {queryError}</div>
      )}

      {/* 結果一覧 */}
      {isSearching && (
        <div className="space-y-2">
          {conversations.map((conv: any) => {
            const profile = conv.profiles
            const character = conv.characters
            return (
              <ConvQueueLink
                key={conv.id}
                convId={conv.id}
                allConvIds={conversations.map((c: any) => c.id)}
                returnTo={`/admin/conversations/search?${new URLSearchParams(
                  Object.fromEntries(Object.entries(sp).filter(([, v]) => v != null) as [string, string][])
                )}`}
                className={`block glass rounded-xl px-5 py-4 hover:border-[var(--color-primary-light)]/40 transition-all ${
                  conv.is_unread_staff ? 'border-[var(--color-primary)]/40 ring-1 ring-[var(--color-primary)]/20' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-[var(--color-border)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={character?.avatar_url} alt={character?.name} className="w-full h-full object-cover" />
                    </div>
                    {conv.is_unread_staff && (
                      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-400 border-2 border-[var(--color-bg)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
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
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-[var(--color-text-muted)]">残り: {profile?.points ?? 0}T</span>
                      {conv.staff_note && (
                        <span className="flex items-center gap-1 text-xs text-amber-400">
                          <FileText size={11} />メモあり
                        </span>
                      )}
                      {conv.is_unread_staff && (
                        <span className="text-xs text-red-400 font-medium">● 未返信</span>
                      )}
                    </div>
                  </div>
                </div>
              </ConvQueueLink>
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
