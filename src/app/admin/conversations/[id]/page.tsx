'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Send, ChevronLeft, Loader2 } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Message, Character, Profile } from '@/types'

export default function AdminConversationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [messages, setMessages] = useState<Message[]>([])
  const [character, setCharacter] = useState<Character | null>(null)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // supabaseクライアントとチャンネルはRefで保持して再生成しない
  const supabaseRef = useRef(createClient())
  const channelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null)
  // タイピング停止タイマー
  const stopTypingTimerRef = useRef<NodeJS.Timeout | null>(null)

  const supabase = supabaseRef.current

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    loadData()
    return () => {
      // アンマウント時にタイピング停止を通知してチャンネル解除
      broadcastTyping(false)
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current)
    }
  }, [id])

  useEffect(() => { scrollToBottom() }, [messages])

  const loadData = async () => {
    const { data: conv } = await supabase
      .from('conversations').select('id, characters(*), profiles(*)').eq('id', id).single()
    if (!conv) { router.push('/admin/conversations'); return }

    setCharacter((conv as any).characters)
    setUserProfile((conv as any).profiles)

    const { data: msgs } = await supabase
      .from('messages').select('*').eq('conversation_id', id).order('created_at', { ascending: true })
    setMessages(msgs || [])

    await supabase.from('conversations').update({ is_unread_staff: false }).eq('id', id)

    // ユーザーと同じチャンネル名 chat:${id} を使う（broadcastを届けるため）
    const channel = supabase.channel(`chat:${id}`)

    channel.on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages',
      filter: `conversation_id=eq.${id}`,
    }, (payload) => {
      const m = payload.new as Message
      setMessages(prev => prev.find(p => p.id === m.id) ? prev : [...prev, m])
    })

    channel.subscribe()
    channelRef.current = channel

    setLoading(false)
  }

  // ブロードキャストでタイピング状態を送信
  const broadcastTyping = useCallback((isTyping: boolean) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { isTyping },
    })
  }, [])

  // テキストエリアのフォーカス→タイピング開始
  const handleFocus = () => {
    broadcastTyping(true)
  }

  // 入力中→タイピング継続、3秒無入力でタイピング停止
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'

    broadcastTyping(true)

    // 3秒後に自動でタイピング停止
    if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current)
    stopTypingTimerRef.current = setTimeout(() => {
      broadcastTyping(false)
    }, 3000)
  }

  // フォーカスを外したらタイピング停止
  const handleBlur = () => {
    if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current)
    broadcastTyping(false)
  }

  const sendReply = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    const content = input.trim()
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    // 送信前にタイピング停止を通知
    if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current)
    broadcastTyping(false)

    const { data: msg } = await supabase.from('messages').insert({
      conversation_id: id, sender_role: 'character', content, points_used: 0,
    }).select().single()

    // 楽観的更新：realtimeより先に表示
    if (msg) setMessages(prev => prev.find(p => p.id === msg.id) ? prev : [...prev, msg])

    // ユーザー側に新着をbroadcast（postgres_changesが無効でも届く）
    if (msg) {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'new_message',
        payload: { message: msg },
      })
    }

    await supabase.from('conversations').update({
      last_message_at: new Date().toISOString(), is_unread_staff: false,
    }).eq('id', id)

    // ユーザーのメッセージを既読にする
    await supabase.from('messages').update({ is_read: true })
      .eq('conversation_id', id).eq('sender_role', 'user').eq('is_read', false)

    setSending(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" style={{ color: 'var(--color-primary)' }} size={22} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] -mx-5 -my-6">

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
        style={{ background: 'rgba(23,18,13,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--color-border)' }}>
        <Link href="/admin/conversations" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
          <ChevronLeft size={20} />
        </Link>
        {character && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-[var(--color-border-warm)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={character.avatar_url} alt={character.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-medium leading-tight">
                {character.name} として返信
              </p>
              {userProfile && (
                <p className="text-[var(--color-text-muted)] text-xs">
                  相手: {userProfile.display_name ?? '匿名'} · 残
                  {Math.max(0, 5 - userProfile.free_messages_used)}無料 · {userProfile.points}T
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4"
        style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((msg, i) => {
          const isOp = msg.sender_role === 'character'
          const showDate = i === 0 || (
            new Date(msg.created_at).toDateString() !== new Date(messages[i - 1].created_at).toDateString()
          )
          return (
            <div key={msg.id}>
              {showDate && (
                <div className="text-center my-3">
                  <span className="text-[var(--color-text-muted)] text-xs px-3 py-1 rounded-full"
                    style={{ background: 'var(--color-surface-2)' }}>
                    {format(new Date(msg.created_at), 'M月d日(E)', { locale: ja })}
                  </span>
                </div>
              )}
              <div className={`flex items-end gap-2 ${isOp ? 'flex-row-reverse' : ''}`}>
                <div className={`max-w-[72%] flex flex-col gap-1 ${isOp ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-2.5 text-sm leading-relaxed ${isOp ? 'bubble-user' : 'bubble-operator'}`}>
                    {msg.content}
                  </div>
                  <span className="text-[var(--color-text-muted)] text-[11px] px-1">
                    {isOp ? character?.name : userProfile?.display_name}
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

      {/* Input */}
      <div className="flex-shrink-0 px-5 py-4"
        style={{ borderTop: '1px solid var(--color-border)', background: 'rgba(23,18,13,0.95)' }}>
        {character && (
          <p className="text-[var(--color-text-muted)] text-xs mb-2">
            {character.name} として返信 · フォーカスするとユーザー側に「入力中」が表示されます
          </p>
        )}
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
            rows={3}
            placeholder={`${character?.name}として返信… (Shift+Enterで改行)`}
            className="flex-1 input-warm px-4 py-2.5 text-sm resize-none"
          />
          <button
            onClick={sendReply}
            disabled={!input.trim() || sending}
            className="btn-primary px-4 flex items-center gap-1.5 text-sm disabled:opacity-40"
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            送信
          </button>
        </div>
      </div>
    </div>
  )
}
