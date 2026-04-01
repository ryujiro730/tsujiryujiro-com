import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

export default async function AdminConversationsPage() {
  const supabase = createClient()

  const { data: conversations } = await supabase
    .from('conversations')
    .select(`
      id,
      last_message_at,
      is_unread_staff,
      characters ( id, name, avatar_url ),
      profiles ( id, user_code, display_name, points, free_messages_used )
    `)
    .eq('is_unread_staff', true)
    .order('last_message_at', { ascending: false })

  // 各会話の最新メッセージを取得
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold">受信トレイ</h1>
      </div>

      <div className="space-y-2">
        {conversations?.map((conv: any) => {
          const lastMsg = lastMsgMap.get(conv.id)
          return (
            <Link
              key={conv.id}
              href={`/admin/conversations/${conv.id}`}
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
            </Link>
          )
        })}
      </div>

      {(!conversations || conversations.length === 0) && (
        <div className="text-center py-20 text-[var(--color-text-muted)]">
          <p>メッセージはありません</p>
        </div>
      )}
    </div>
  )
}
