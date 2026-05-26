'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Send, ArrowLeft, User, Loader2 } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Message, Character, Profile } from '@/types'

export default function StaffConversationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [character, setCharacter] = useState<Character | null>(null)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => { loadData() }, [id])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const loadData = async () => {
    // 会話情報
    const { data: conv } = await supabase
      .from('conversations')
      .select(`
        id,
        characters ( * ),
        profiles ( * )
      `)
      .eq('id', id)
      .single()

    if (!conv) { router.push('/staff/conversations'); return }

    setCharacter((conv as any).characters)
    setUserProfile((conv as any).profiles)

    // メッセージ
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    setMessages(msgs || [])

    // リアルタイム
    supabase
      .channel(`staff-conv:${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message])
      })
      .subscribe()

    setLoading(false)
  }

  const sendReply = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    const content = input.trim()
    setInput('')

    const { data: msg } = await supabase.from('messages').insert({
      conversation_id: id,
      sender_role: 'character',
      content,
      points_used: 0,
    }).select().single()

    if (msg) setMessages(prev => [...prev, msg])

    // 会話更新（スタッフ返信済み）
    await supabase.from('conversations').update({
      last_message_at: new Date().toISOString(),
      is_unread_staff: false,
    }).eq('id', id)

    // TODO: LINE通知をここに追加

    setSending(false)
  }

  const getSuggestion = () => {
    const lastUserMsg = [...messages].reverse().find(m => m.sender_role === 'user')
    return lastUserMsg?.content ?? ''
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[var(--color-primary)]" size={28} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] -m-6">
      {/* ヘッダー */}
      <div className="glass border-b border-[var(--color-border)] px-5 py-3 flex items-center gap-4 flex-shrink-0">
        <Link href="/staff/conversations" className="p-1.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors">
          <ArrowLeft size={18} className="text-[var(--color-text-muted)]" />
        </Link>

        {/* キャラ */}
        {character && (
          <div className="flex items-center gap-2">
            <div className="relative w-9 h-9 rounded-full overflow-hidden border border-[var(--color-primary)]/50">
              <Image src={character.avatar_url} alt={character.name} fill className="object-cover" />
            </div>
            <div>
              <p className="text-sm font-medium">{character.name}</p>
              <p className="text-[var(--color-text-muted)] text-xs">として返信中</p>
            </div>
          </div>
        )}

        <div className="w-px h-6 bg-[var(--color-border)]" />

        {/* ユーザー */}
        {userProfile && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center">
              <User size={14} className="text-[var(--color-text-muted)]" />
            </div>
            <div>
              <p className="text-sm">{userProfile.display_name}</p>
              <p className="text-[var(--color-text-muted)] text-xs">残 {userProfile.points}pt</p>
            </div>
          </div>
        )}
      </div>

      {/* メッセージ */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {messages.map((msg, i) => {
          const isCharacter = msg.sender_role === 'character'
          const showDate = i === 0 || (
            new Date(msg.created_at).toDateString() !==
            new Date(messages[i - 1].created_at).toDateString()
          )

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="text-center my-4">
                  <span className="text-[var(--color-text-muted)] text-xs bg-[var(--color-surface-2)] px-3 py-1 rounded-full">
                    {format(new Date(msg.created_at), 'M月d日(E)', { locale: ja })}
                  </span>
                </div>
              )}
              <div className={`flex items-end gap-2 ${isCharacter ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`max-w-[70%] flex flex-col gap-1 ${isCharacter ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-2.5 text-sm leading-relaxed ${isCharacter ? 'bubble-user text-white' : 'bubble-character'}`}>
                    {msg.content}
                  </div>
                  <span className="text-[var(--color-text-muted)] text-xs px-1">
                    {isCharacter ? `${character?.name}（返信済）` : userProfile?.display_name}
                    {' · '}
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ja })}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 返信入力 */}
      <div className="glass border-t border-[var(--color-border)] px-5 py-4 flex-shrink-0">
        <div className="mb-2 flex items-center gap-2">
          {character && (
            <div className="relative w-6 h-6 rounded-full overflow-hidden">
              <Image src={character.avatar_url} alt={character.name} fill className="object-cover" />
            </div>
          )}
          <span className="text-xs text-[var(--color-text-muted)]">
            {character?.name} として返信する
          </span>
        </div>
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() }
            }}
            rows={3}
            placeholder={`${character?.name}として返信を入力… (Shift+Enterで改行)`}
            className="flex-1 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          />
          <div className="flex flex-col gap-2">
            <button
              onClick={sendReply}
              disabled={!input.trim() || sending}
              className="btn-primary px-4 py-3 rounded-xl disabled:opacity-40 flex items-center gap-1.5"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              送信
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
