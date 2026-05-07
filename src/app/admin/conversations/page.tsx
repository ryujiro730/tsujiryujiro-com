import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ConvQueueLink } from '@/components/admin/ConvQueueLink'
import { unstable_noStore as noStore } from 'next/cache'

const PAGE_SIZE = 50

type SearchParams = { filter?: string; page?: string }

export default async function AdminConversationsPage({ searchParams }: { searchParams: SearchParams }) {
  noStore()
  // service role でRLSをバイパス（管理画面は layout.tsx で認証済み）
  const supabase = createAdminClient()
  const unreadOnly = searchParams.filter !== 'all'
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('conversations')
    .select(`
      id,
      last_message_at,
      last_message_content,
      last_message_sender_role,
      is_unread_staff,
      characters ( id, name, avatar_url ),
      profiles ( id, user_code, display_name, points )
    `, { count: 'exact' })
    .order('last_message_at', { ascending: false })
    .range(from, to)

  if (unreadOnly) {
    query = query.eq('is_unread_staff', true)
  }

  const { data: conversations, count } = await query

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)
  const baseHref = unreadOnly ? '/admin/conversations' : '/admin/conversations?filter=all'

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">受信トレイ</h1>
          {count != null && (
            <span className="text-sm text-[var(--color-text-muted)]">{count}件</span>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/conversations"
            className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${unreadOnly ? 'bg-[var(--color-primary)] text-white' : 'glass text-[var(--color-text-muted)]'}`}
          >
            未返信のみ
          </Link>
          <Link
            href="?filter=all"
            className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${!unreadOnly ? 'bg-[var(--color-primary)] text-white' : 'glass text-[var(--color-text-muted)]'}`}
          >
            すべて
          </Link>
        </div>
      </div>

      <div className="space-y-2">
        {conversations?.map((conv: any) => (
          <ConvQueueLink
            key={conv.id}
            convId={conv.id}
            allConvIds={(conversations ?? []).map((c: any) => c.id)}
            returnTo={`/admin/conversations${unreadOnly ? '' : '?filter=all'}`}
            className={`block glass rounded-xl px-5 py-4 hover:border-[var(--color-primary-light)]/40 transition-all ${
              conv.is_unread_staff ? 'border-[var(--color-primary)]/40 ring-1 ring-[var(--color-primary)]/20' : ''
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-[var(--color-border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={conv.characters?.avatar_url} alt={conv.characters?.name} className="w-full h-full object-cover" />
                </div>
                {conv.is_unread_staff && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-400 border-2 border-[var(--color-bg)]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      {conv.profiles?.display_name || conv.profiles?.email || '匿名ユーザー'}
                    </span>
                    {conv.profiles?.user_code && (
                      <span className="font-mono text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded">
                        {conv.profiles.user_code}
                      </span>
                    )}
                    <span className="text-xs text-[var(--color-text-muted)]">→ {conv.characters?.name}</span>
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">
                    {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: ja })}
                  </span>
                </div>

                {conv.last_message_content && (
                  <p className="text-[var(--color-text-muted)] text-sm truncate">
                    {conv.last_message_sender_role === 'character' ? '（返信済）' : ''}
                    {conv.last_message_content}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-[var(--color-text-muted)]">
                    残り: {(conv.profiles?.points ?? 0)}T
                  </span>
                  {conv.is_unread_staff && (
                    <span className="text-xs text-red-400 font-medium">● 未返信</span>
                  )}
                </div>
              </div>
            </div>
          </ConvQueueLink>
        ))}
      </div>

      {(!conversations || conversations.length === 0) && (
        <div className="text-center py-20 text-[var(--color-text-muted)]">
          <p>{unreadOnly ? '未返信のメッセージはありません' : '会話がありません'}</p>
        </div>
      )}

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          {page > 1 && (
            <Link
              href={`${baseHref}${baseHref.includes('?') ? '&' : '?'}page=${page - 1}`}
              className="px-4 py-2 rounded-lg text-sm glass hover:border-[var(--color-primary-light)]/40 transition-colors"
            >
              ← 前
            </Link>
          )}
          <span className="text-sm text-[var(--color-text-muted)]">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`${baseHref}${baseHref.includes('?') ? '&' : '?'}page=${page + 1}`}
              className="px-4 py-2 rounded-lg text-sm glass hover:border-[var(--color-primary-light)]/40 transition-colors"
            >
              次 →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
