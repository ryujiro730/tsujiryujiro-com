import { createClient } from '@/lib/supabase/server'
import { Search, MessageSquare } from 'lucide-react'
import { SavedTemplateList, SaveTemplateButton } from '@/components/admin/SearchTemplates'
import { SearchResults } from '@/components/admin/SearchResults'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { LabelFilter } from '@/components/admin/LabelFilter'

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
  login_from?: string
  login_to?: string
  payment_from?: string
  payment_to?: string
  spend_from?: string
  spend_to?: string
  charged_min?: string
  charged_max?: string
  // 積み数
  stack_min?: string
  stack_max?: string
  // ラベル
  label_ids?: string | string[]
  label_mode?: string
  // 表示設定
  dedup?: string
  sort?: string
  order?: string
}

function intersectArrays(first: string[], ...rest: string[][]): string[] {
  const sets = rest.map(a => new Set(a))
  return first.filter(id => sets.every(s => s.has(id)))
}


export default async function AdminConversationsSearchPage({
  searchParams: sp,
}: {
  searchParams: SP
}) {
  const supabase = createClient()

  const [{ data: characters }, { data: allLabels }] = await Promise.all([
    supabase.from('characters').select('id, name').order('name'),
    supabase.from('admin_labels').select('id, name, color').order('name'),
  ])

  // 保存済みテンプレート
  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data: savedTemplates } = await adminDb
    .from('search_templates')
    .select('id, name, params, created_at, admin_id')
    .order('created_at', { ascending: false })


  const isSearching = Object.entries(sp).some(
    ([k, v]) => !['sort', 'order', 'dedup', 'label_mode'].includes(k) && !!v,
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
      sp.login_from || sp.login_to ||
      sp.payment_from || sp.payment_to ||
      sp.charged_min || sp.charged_max

    let profileIncludeIds: string[] | null = null
    if (hasProfileFilter) {
      let pq = supabase.from('profiles').select('id').not('role', 'in', '(admin,staff)')
      if (sp.user_code?.trim())       pq = pq.ilike('user_code', `%${sp.user_code.trim()}%`)
      if (sp.user_name?.trim())       pq = pq.ilike('display_name', `%${sp.user_name.trim()}%`)
      if (sp.gender)                  pq = pq.eq('gender', sp.gender)
      if (sp.age_min)                 pq = pq.gte('age', parseInt(sp.age_min))
      if (sp.age_max)                 pq = pq.lte('age', parseInt(sp.age_max))
      if (sp.points_min)              pq = pq.gte('points', parseInt(sp.points_min))
      if (sp.points_max)              pq = pq.lte('points', parseInt(sp.points_max))
      if (sp.registered_from)         pq = pq.gte('created_at', sp.registered_from)
      if (sp.registered_to)           pq = pq.lte('created_at', `${sp.registered_to}T23:59:59`)
      if (sp.login_from)              pq = pq.gte('last_login_at', sp.login_from)
      if (sp.login_to)                pq = pq.lte('last_login_at', `${sp.login_to}T23:59:59`)
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
      spendIncludeIds = Array.from(new Set(data?.map(t => t.user_id) ?? []))
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

    // ラベルフィルタ
    const rawLabelIds = sp.label_ids
    const selectedLabelIds = rawLabelIds ? (Array.isArray(rawLabelIds) ? rawLabelIds : [rawLabelIds]) : []
    const labelMode = sp.label_mode ?? 'or'
    let labelExcludeUserIds: Set<string> | null = null

    if (!noResults && selectedLabelIds.length > 0) {
      const { data: labelAssignments } = await supabase
        .from('user_label_assignments')
        .select('user_id, label_id')
        .in('label_id', selectedLabelIds)

      if (labelMode === 'not') {
        const excludeIds = new Set((labelAssignments ?? []).map(a => a.user_id))
        if (finalUserIds !== null) {
          finalUserIds = finalUserIds.filter(uid => !excludeIds.has(uid))
          if (finalUserIds.length === 0) noResults = true
        } else {
          labelExcludeUserIds = excludeIds
        }
      } else if (labelMode === 'or') {
        const incIds = Array.from(new Set((labelAssignments ?? []).map(a => a.user_id)))
        if (incIds.length === 0) {
          noResults = true
        } else if (finalUserIds !== null) {
          finalUserIds = finalUserIds.filter(uid => incIds.includes(uid))
          if (finalUserIds.length === 0) noResults = true
        } else {
          finalUserIds = incIds
        }
      } else if (labelMode === 'and') {
        const userLabelMap = new Map<string, Set<string>>()
        for (const a of labelAssignments ?? []) {
          if (!userLabelMap.has(a.user_id)) userLabelMap.set(a.user_id, new Set())
          userLabelMap.get(a.user_id)!.add(a.label_id)
        }
        const incIds = Array.from(userLabelMap.entries())
          .filter(([, s]) => selectedLabelIds.every(lid => s.has(lid)))
          .map(([uid]) => uid)
        if (incIds.length === 0) {
          noResults = true
        } else if (finalUserIds !== null) {
          finalUserIds = finalUserIds.filter(uid => incIds.includes(uid))
          if (finalUserIds.length === 0) noResults = true
        } else {
          finalUserIds = incIds
        }
      }
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
      const ids = Array.from(new Set(data?.map(m => m.conversation_id) ?? []))
      if (ids.length === 0) noResults = true
      else convIncludeSets.push(ids)
    }

    // ユーザー最終送信日時
    if (!noResults && sp.user_sent_from) {
      const { data } = await supabase.from('messages')
        .select('conversation_id').eq('sender_role', 'user').gte('created_at', sp.user_sent_from).limit(500)
      const ids = Array.from(new Set(data?.map(m => m.conversation_id) ?? []))
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
      const ids = Array.from(new Set(data?.map(m => m.conversation_id) ?? []))
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
        id, last_message_at, is_unread_staff, staff_note, last_message_sender_role, stack_count,
        characters ( id, name, avatar_url ),
        profiles ( id, user_code, display_name, email, age, gender, points )
      `)

      query = query.eq('has_user_reply', true)   // ユーザーが1通でも返信した会話のみ
      // 返信済み/未返信は last_message_sender_role で判定（is_unread_staffは一括送信等でズレる）
      if (sp.unread === 'unread')  query = query.eq('last_message_sender_role', 'user')
      if (sp.unread === 'read')    query = query.eq('last_message_sender_role', 'character')
      if (sp.has_note === '1')     query = query.not('staff_note', 'is', null).neq('staff_note', '')
      if (sp.character_id)         query = query.eq('character_id', sp.character_id)
      if (sp.last_msg_from)        query = query.gte('last_message_at', sp.last_msg_from)
      if (sp.last_msg_to)          query = query.lte('last_message_at', `${sp.last_msg_to}T23:59:59`)
      if (sp.stack_min)            query = query.gte('stack_count', parseInt(sp.stack_min))
      if (sp.stack_max)            query = query.lte('stack_count', parseInt(sp.stack_max))
      if (finalUserIds !== null)   query = query.in('user_id', finalUserIds)
      if (finalConvIds !== null)   query = query.in('id', finalConvIds)

      const sort = sp.sort ?? 'last_msg_desc'
      const sortByPoints = sort === 'points_asc' || sort === 'points_desc'
      const lastMsgAsc = sort === 'last_msg_asc'

      // ポイントソートの場合はDB側でlast_message_atで取得し、後でJS側ソート
      query = query.order('last_message_at', { ascending: sortByPoints ? false : lastMsgAsc }).limit(fetchLimit)

      const { data, error: qErr } = await query
      if (qErr) { queryError = qErr.message }

      let results = data ?? []

      // 除外セット適用
      if (convExcludeIds.size > 0)
        results = results.filter(c => !convExcludeIds.has(c.id))
      if (spendExcludeIds && spendExcludeIds.size > 0)
        results = results.filter(c => !spendExcludeIds!.has((c as any).profiles?.id))
      if (labelExcludeUserIds && labelExcludeUserIds.size > 0)
        results = results.filter(c => !labelExcludeUserIds!.has((c as any).profiles?.id))

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
      }

      // クライアントサイドソート
      if (sortByPoints) {
        results.sort((a, b) => {
          const pa = (a as any).profiles?.points ?? 0
          const pb = (b as any).profiles?.points ?? 0
          return sort === 'points_asc' ? pa - pb : pb - pa
        })
      } else {
        results.sort((a, b) =>
          lastMsgAsc
            ? a.last_message_at.localeCompare(b.last_message_at)
            : b.last_message_at.localeCompare(a.last_message_at)
        )
      }

      results = results.slice(0, 100)
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

      {/* 保存済みテンプレート */}
      {(savedTemplates ?? []).length > 0 && (
        <div className="mb-4">
          <SavedTemplateList templates={(savedTemplates ?? []) as any} />
        </div>
      )}

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
            {/* スタッフメモ・積み数 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>スタッフメモ</label>
                <select name="has_note" defaultValue={sp.has_note ?? ''} className={inputCls}>
                  <option value="">すべて</option>
                  <option value="1">メモあり</option>
                </select>
              </div>
            </div>
            {/* 積み数 */}
            <div>
              <label className={labelCls}>積み数（キャラの未返信連続送信数）</label>
              <div className="flex items-center gap-2">
                <input type="number" name="stack_min" defaultValue={sp.stack_min}
                  placeholder="1" min="0" className={inputCls} />
                <span className="text-[var(--color-text-muted)] text-xs flex-shrink-0">〜</span>
                <input type="number" name="stack_max" defaultValue={sp.stack_max}
                  placeholder="5" min="0" className={inputCls} />
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
            {/* ラベル */}
            <div>
              <label className={labelCls}>ラベル</label>
              <LabelFilter
                labels={allLabels ?? []}
                selectedIds={sp.label_ids ? (Array.isArray(sp.label_ids) ? sp.label_ids : [sp.label_ids]) : []}
                mode={sp.label_mode ?? 'or'}
              />
            </div>

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
            {/* 最終ログイン日時 */}
            <div>
              <label className={labelCls}>最終ログイン日時</label>
              <div className="flex items-center gap-2">
                <input type="date" name="login_from" defaultValue={sp.login_from} className={inputCls} />
                <span className="text-[var(--color-text-muted)] text-xs flex-shrink-0">〜</span>
                <input type="date" name="login_to" defaultValue={sp.login_to} className={inputCls} />
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>重複</label>
              <select name="dedup" defaultValue={sp.dedup ?? ''} className={inputCls}>
                <option value="">重複あり（全件）</option>
                <option value="yes">重複なし（ユーザーごと最古）</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>並び順</label>
              <select name="sort" defaultValue={sp.sort ?? 'last_msg_desc'} className={inputCls}>
                <option value="points_asc">所持ポイント 低い順</option>
                <option value="points_desc">所持ポイント 高い順</option>
                <option value="last_msg_desc">最終メッセージ 近い順</option>
                <option value="last_msg_asc">最終メッセージ 遠い順</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1 flex-wrap">
          <button type="submit" className="btn-primary px-5 py-2 text-sm">検索</button>
          {isSearching && (
            <a href="/admin/conversations/search" className="btn-ghost px-5 py-2 text-sm">リセット</a>
          )}
          {isSearching && <SaveTemplateButton />}
        </div>
      </form>

      {/* 検索前の案内 */}
      {!isSearching && (
        <div className="text-center py-20 text-[var(--color-text-muted)]">
          <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">条件を入力するか、クイック検索を使ってください</p>
        </div>
      )}

      {queryError && (
        <div className="text-red-400 text-sm mb-4">エラー: {queryError}</div>
      )}

      {/* 結果一覧（チェックボックス・一括送信含む） */}
      {isSearching && (
        <SearchResults
          conversations={conversations as any}
          isDedup={sp.dedup === 'yes'}
          returnTo={`/admin/conversations/search?${new URLSearchParams(
            Object.fromEntries(Object.entries(sp).filter(([, v]) => v != null) as [string, string][])
          )}`}
        />
      )}
    </div>
  )
}
