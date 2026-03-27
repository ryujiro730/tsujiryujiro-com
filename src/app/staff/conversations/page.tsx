import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import { MessageCircle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

export default async function StaffConversationsPage({
  searchParams,
}: {
  searchParams: { filter?: string }
}) {
  const supabase = createClient()
  const filter = searchParams.filter ?? 'unread'

  let query = supabase
    .from('conversations')
    .select(`
      id,
      last_message_at,
      is_unread_staff,
      characters ( id, name, avatar_url ),
      profiles ( id, display_name, avatar_url ),
      messages ( id, content, sender_role, created_at )
    `)
    .order('last_message_at', { ascending: false })
    .limit(50)

  if (filter === 'unread') {
    query = query.eq('is_unread_staff', true)
  }

  const { data: conversations } = await query

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl">チャット一覧</h1>
        <div className="flex gap-2">
          {['unread', 'all'].map(f => (
            <Link
              key={f}
              href={`/staff/conversations?filter=${f}`}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                filter === f
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'btn-ghost'
              }`}
            >
              {f === 'unread' ? '未返信' : 'すべて'}
            </Link>
          ))}
        </div>
      </div>

      {conversations && conversations.length > 0 ? (
        <div className="space-y-3">
          {conversations.map((conv: any) => {
            // messagesは配列で返ってくる → 最新1件を取得
            const lastMsg = conv.messages
              ?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

            return (
              <Link
                key={conv.id}
                href={`/staff/conversations/${conv.id}`}
                className={`glass rounded-2xl p-4 flex items-center gap-4 hover:border-pink-400/30 transition-all block ${
                  conv.is_unread_staff ? 'border-[var(--color-primary)]/40' : ''
                }`}
              >
                {/* キャラアバター */}
                <div className="relative flex-shrink-0">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border border-[var(--color-border)]">
                    <Image
                      src={conv.characters?.avatar_url ?? ''}
                      alt={conv.characters?.name ?? ''}
                      fill className="object-cover"
                    />
                  </div>
                  {conv.is_unread_staff && (
                    <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[var(--color-primary)] border-2 border-[var(--color-bg)]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{conv.characters?.name}</span>
                    <span className="text-[var(--color-text-muted)] text-xs">←</span>
                    <span className="text-[var(--color-text-muted)] text-xs truncate">
                      {conv.profiles?.display_name}
                    </span>
                    {conv.is_unread_staff && (
                      <span className="ml-auto flex-shrink-0 bg-[var(--color-primary)] text-white text-xs px-2 py-0.5 rounded-full">
                        未返信
                      </span>
                    )}
                  </div>
                  <p className="text-[var(--color-text-muted)] text-sm truncate">
                    {lastMsg?.content ?? 'メッセージなし'}
                  </p>
                </div>

                <div className="flex-shrink-0 text-right">
                  <p className="text-[var(--color-text-muted)] text-xs flex items-center gap-1">
                    <Clock size={10} />
                    {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: ja })}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center">
          <MessageCircle size={40} className="text-[var(--color-text-muted)] mx-auto mb-4" />
          <p className="text-[var(--color-text-muted)]">
            {filter === 'unread' ? '未返信のチャットはありません 🎉' : 'チャットはまだありません'}
          </p>
        </div>
      )}
    </div>
  )
}
