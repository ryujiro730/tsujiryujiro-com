import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

export default async function ConversationsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: conversations } = await supabase
    .from('conversations')
    .select(`id, last_message_at, characters(id, name, avatar_url)`)
    .eq('user_id', user.id)
    .not('last_message_at', 'is', null)
    .order('last_message_at', { ascending: false })

  const convIds = (conversations ?? []).map(c => c.id)

  // 各会話の最新メッセージと未読数だけ取得
  const { data: lastMessages } = convIds.length > 0
    ? await supabase
        .from('messages')
        .select('conversation_id, content, sender_role, created_at, is_read')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const lastMsgMap = new Map<string, { content: string; sender_role: string }>()
  const unreadMap = new Map<string, number>()
  lastMessages?.forEach(msg => {
    if (!lastMsgMap.has(msg.conversation_id)) {
      lastMsgMap.set(msg.conversation_id, { content: msg.content, sender_role: msg.sender_role })
    }
    if (msg.sender_role === 'character' && !msg.is_read) {
      unreadMap.set(msg.conversation_id, (unreadMap.get(msg.conversation_id) ?? 0) + 1)
    }
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6 pt-2">
        <h1 className="text-xl font-bold">会話一覧</h1>
        <Link href="/characters" className="text-sm" style={{ color: 'var(--color-primary)' }}>
          + 新しく話す
        </Link>
      </div>

      {conversations && conversations.length > 0 ? (
        <div className="space-y-2">
          {conversations.map((conv: any) => {
            const lastMsg = lastMsgMap.get(conv.id)
            const unread = unreadMap.get(conv.id) ?? 0

            return (
              <Link
                key={conv.id}
                href={`/chat?character=${conv.characters?.id}`}
                className="card flex items-center gap-3 p-4 block hover:border-[var(--color-border-warm)] transition-colors"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-[var(--color-border-warm)]">
                    <Image src={conv.characters?.avatar_url} alt={conv.characters?.name ?? ''} width={48} height={48} className="w-full h-full object-cover" />
                  </div>
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white font-bold" style={{ background: 'var(--color-primary)' }}>
                      {unread}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-sm font-medium ${unread > 0 ? '' : 'text-[var(--color-text)]'}`}>
                      {conv.characters?.name}
                    </span>
                    <span className="text-[var(--color-text-muted)] text-[11px] flex-shrink-0">
                      {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: ja })}
                    </span>
                  </div>
                  {lastMsg && (
                    <p className={`text-xs truncate ${unread > 0 ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}>
                      {lastMsg.sender_role === 'character' ? `${conv.characters?.name}: ` : 'あなた: '}
                      {lastMsg.content}
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="card p-10 text-center">
          <p className="text-[var(--color-text-muted)] text-sm mb-4">まだ会話がありません</p>
          <Link href="/characters" className="btn-primary px-5 py-2.5 text-sm inline-block">
            話し相手を探す
          </Link>
        </div>
      )}
    </div>
  )
}
