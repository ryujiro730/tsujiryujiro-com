import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { unstable_noStore as noStore } from 'next/cache'

export default async function ConversationsPage() {
  noStore()
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const userId = session.user.id

  const { data: conversations } = await supabase
    .from('conversations')
    .select(`id, last_message_at, characters(id, name, avatar_url)`)
    .eq('user_id', userId)
    .not('last_message_at', 'is', null)
    .order('last_message_at', { ascending: false })

  const convIds = (conversations ?? []).map(c => c.id)

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
          {(conversations as any[]).map((conv) => {
            const lastMsg = lastMsgMap.get(conv.id)
            const unread = unreadMap.get(conv.id) ?? 0

            return (
              <Link
                key={conv.id}
                href={`/chat?character=${conv.characters?.id}`}
                className="block"
              >
                <div
                  className="flex items-center gap-3 p-4 rounded-2xl transition-all duration-200"
                  style={unread > 0 ? {
                    background: 'linear-gradient(135deg, rgba(249,168,184,0.18) 0%, rgba(232,121,160,0.10) 100%)',
                    border: '1.5px solid var(--color-primary)',
                    boxShadow: '0 2px 16px rgba(232,121,160,0.15)',
                  } : {
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {/* アバター */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-13 h-13 rounded-full overflow-hidden"
                      style={{
                        width: '52px', height: '52px',
                        border: unread > 0 ? '2px solid var(--color-primary)' : '1px solid var(--color-border-warm)',
                        boxShadow: unread > 0 ? '0 0 12px var(--color-primary-glow)' : 'none',
                      }}
                    >
                      <Image
                        src={conv.characters?.avatar_url}
                        alt={conv.characters?.name ?? ''}
                        width={52} height={52}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {unread > 0 && (
                      <span
                        className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full flex items-center justify-center text-[11px] text-white font-bold px-1"
                        style={{ background: 'var(--color-primary)', boxShadow: '0 1px 6px rgba(232,121,160,0.5)' }}
                      >
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>

                  {/* テキスト */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-semibold">
                        {conv.characters?.name}
                      </span>
                      <span className="text-[11px] flex-shrink-0 ml-2"
                        style={{ color: unread > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                        {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: ja })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {unread > 0 && (
                        <span
                          className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: 'var(--color-primary)', color: '#fff' }}
                        >
                          新着
                        </span>
                      )}
                      {lastMsg && (
                        <p className="text-xs truncate"
                          style={{ color: unread > 0 ? 'var(--color-text)' : 'var(--color-text-muted)', fontWeight: unread > 0 ? 500 : 400 }}>
                          {lastMsg.sender_role === 'character' ? `${conv.characters?.name}: ` : 'あなた: '}
                          {lastMsg.content}
                        </p>
                      )}
                    </div>
                  </div>
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
