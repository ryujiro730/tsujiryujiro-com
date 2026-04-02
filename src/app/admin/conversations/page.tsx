import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ConvQueueLink } from '@/components/admin/ConvQueueLink'

type SearchParams = { filter?: string }

export default async function AdminConversationsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient()
  const unreadOnly = searchParams.filter !== 'all'

  let query = supabase
    .from('conversations')
    .select(`
      id,
      last_message_at,
      is_unread_staff,
      characters ( id, name, avatar_url ),
      profiles ( id, user_code, display_name, points )
    `)
    .order('last_message_at', { ascending: false })

  if (unreadOnly) {
    query = query.eq('is_unread_staff', true)
  }

  const { data: conversations } = await query

  const convIds = (conversations ?? []).map(c => c.id)
  const { data: lastMessages } = convIds.length > 0
    ? await supabase
        .from('messages')
        .select('conversation_id, content, sender_role, created_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const lastMsgMap = new Map<string, { content: string; sender_role: string }>()
  lastMessages?.forEach(msg => {
    if (!lastMsgMap.has(msg.conversation_id)) {
      lastMsgMap.set(msg.conversation_id, { content: msg.content, sender_role: msg.sender_role })
    }
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">受信トレイ</h1>
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
        {conversations?.map((conv: any) => {
          const lastMsg = lastMsgMap.get(conv.id)
          return (
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

                  {lastMsg && (
                    <p className="text-[var(--color-text-muted)] text-sm truncate">
                      {lastMsg.sender_role === 'character' ? '（返信済）' : ''}
                      {lastMsg.content}
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
          )
        })}
      </div>

      {(!conversations || conversations.length === 0) && (
        <div className="text-center py-20 text-[var(--color-text-muted)]">
          <p>{unreadOnly ? '未返信のメッセージはありません' : '会話がありません'}</p>
        </div>
      )}
    </div>
  )
}
