'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'

type Conversation = {
  id: string
  last_message_at: string
  is_unread_staff: boolean
  characters: { id: string; name: string; avatar_url: string } | null
  profiles: { id: string; user_code: string; display_name: string; points: number } | null
  lastMsg?: { content: string; sender_role: string }
}

export default function AdminConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [newCount, setNewCount] = useState(0)
  const supabase = useRef(createClient()).current

  const load = useCallback(async () => {
    const { data: convs } = await supabase
      .from('conversations')
      .select(`id, last_message_at, is_unread_staff, characters ( id, name, avatar_url ), profiles ( id, user_code, display_name, points )`)
      .eq('is_unread_staff', true)
      .order('last_message_at', { ascending: false })

    if (!convs || convs.length === 0) { setConversations([]); return }

    const convIds = convs.map(c => c.id)
    const { data: lastMessages } = await supabase
      .from('messages')
      .select('conversation_id, content, sender_role, created_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false })

    const lastMsgMap = new Map<string, { content: string; sender_role: string }>()
    lastMessages?.forEach(msg => {
      if (!lastMsgMap.has(msg.conversation_id)) {
        lastMsgMap.set(msg.conversation_id, { content: msg.content, sender_role: msg.sender_role })
      }
    })

    setConversations(convs.map(c => ({ ...c, lastMsg: lastMsgMap.get(c.id) })) as Conversation[])
  }, [supabase])

  useEffect(() => {
    load()

    const channel = supabase
      .channel('admin-inbox')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'messages',
      }, () => {
        setNewCount(n => n + 1)
        load()
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'conversations',
      }, () => {
        load()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [load, supabase])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">受信トレイ</h1>
        {newCount > 0 && (
          <span className="text-xs bg-red-500 text-white px-2.5 py-1 rounded-full font-medium">
            +{newCount} 新着
          </span>
        )}
      </div>

      <div className="space-y-2">
        {conversations.map((conv) => (
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
                      {conv.profiles?.display_name || '匿名ユーザー'}
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

                {conv.lastMsg && (
                  <p className="text-[var(--color-text-muted)] text-sm truncate">
                    {conv.lastMsg.sender_role === 'character' ? '（返信済）' : ''}
                    {conv.lastMsg.content}
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
        ))}
      </div>

      {conversations.length === 0 && (
        <div className="text-center py-20 text-[var(--color-text-muted)]">
          <p>メッセージはありません</p>
        </div>
      )}
    </div>
  )
}
