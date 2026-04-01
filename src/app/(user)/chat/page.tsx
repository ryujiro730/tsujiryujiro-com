'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Send, ChevronLeft, Images, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Character, Message, Profile, CharacterPhoto } from '@/types'
import Link from 'next/link'
import Lightbox from '@/components/Lightbox'

export default function ChatPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const characterId = searchParams.get('character')

  const [character, setCharacter] = useState<Character | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const [photos, setPhotos] = useState<CharacterPhoto[]>([])
  const [showAlbum, setShowAlbum] = useState(false)
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const supabaseRef = useRef(createClient())
  const channelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null)
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = supabaseRef.current

  const addMessage = useCallback((msg: Message) => {
    setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg])
  }, [])

  useEffect(() => {
    if (!characterId) { router.push('/characters'); return }
    loadData()
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    }
  }, [characterId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const [profRes, charRes, photosRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('characters').select('*').eq('id', characterId).single(),
      supabase.from('character_photos').select('*').eq('character_id', characterId).order('order_index'),
    ])
    setProfile(profRes.data)
    setCharacter(charRes.data)
    setPhotos(photosRes.data || [])

    let { data: conv } = await supabase
      .from('conversations').select('id')
      .eq('user_id', user.id).eq('character_id', characterId).single()

    if (!conv) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, character_id: characterId })
        .select('id').single()
      conv = newConv
    }
    if (!conv) { setLoading(false); return }

    setConversationId(conv.id)

    const { data: msgs } = await supabase
      .from('messages').select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })
    setMessages(msgs || [])

    const channel = supabase.channel(`chat:${conv.id}`)

    channel.on('broadcast', { event: 'new_message' }, ({ payload }) => {
      const msg = payload.message as Message
      addMessage(msg)
      if (msg.sender_role === 'character') {
        setIsTyping(false)
        supabase.from('messages').update({ is_read: true }).eq('id', msg.id).then(() => {})
      }
    })

    channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      const typing: boolean = payload?.isTyping ?? false
      setIsTyping(typing)
      if (typing) {
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
        typingTimerRef.current = setTimeout(() => setIsTyping(false), 10000)
      }
    })

    channel.on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages',
      filter: `conversation_id=eq.${conv.id}`,
    }, (payload) => {
      const msg = payload.new as Message
      addMessage(msg)
      if (msg.sender_role === 'character') setIsTyping(false)
    })

    channel.subscribe()
    channelRef.current = channel
    setLoading(false)
  }

  const canSend = (profile?.points ?? 0) > 0

  const sendMessage = async () => {
    if (!input.trim() || sending || !conversationId || !profile || !character) return
    if (!canSend) { router.push('/payment'); return }

    setSending(true)
    const content = input.trim()
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({ points: profile.points - 1 }).eq('id', user.id)
    await supabase.from('point_transactions').insert({
      user_id: user.id, amount: -1, type: 'spend', description: `${character.name}へのメッセージ`,
    })
    setProfile(prev => prev ? { ...prev, points: prev.points - 1 } : prev)

    const { data: msg } = await supabase.from('messages').insert({
      conversation_id: conversationId, sender_role: 'user',
      content, points_used: 1,
    }).select().single()

    if (!msg) { setSending(false); return }

    addMessage(msg)

    await supabase.from('conversations').update({
      last_message_at: new Date().toISOString(), is_unread_staff: true,
    }).eq('id', conversationId)

    channelRef.current?.send({
      type: 'broadcast',
      event: 'new_message',
      payload: { message: msg },
    })

    setSending(false)
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const openAlbumLightbox = (index: number) => {
    if (!character) return
    const all = [character.avatar_url, ...photos.map(p => p.url)]
    setLightboxPhotos(all)
    setLightboxIndex(index)
    setShowAlbum(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="flex gap-1.5">
          <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
        </div>
      </div>
    )
  }
  if (!character) return null

  const hasPhotos = photos.length > 0

  return (
    <div className="flex flex-col h-[calc(100dvh-52px)] -mt-5 -mx-4">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ background: 'rgba(23,18,13,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--color-border)' }}>
        <Link href="/characters" className="p-1 -ml-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
          <ChevronLeft size={22} />
        </Link>
        <Link href={`/characters/${character.id}`}>
          <div className="w-9 h-9 rounded-full overflow-hidden border border-[var(--color-border-warm)] flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={character.avatar_url} alt={character.name} className="w-full h-full object-cover" />
          </div>
        </Link>
        <div className="flex-1">
          <Link href={`/characters/${character.id}`}>
            <p className="text-sm font-medium leading-tight hover:opacity-80 transition-opacity">{character.name}</p>
          </Link>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="online-dot" style={{ width: '6px', height: '6px' }} />
            <p className="text-[var(--color-text-muted)] text-xs">AIが返信します</p>
          </div>
        </div>
        {hasPhotos && (
          <button
            onClick={() => setShowAlbum(true)}
            className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <Images size={19} />
          </button>
        )}
        <Link href="/payment" className="text-xs text-[var(--color-accent)] px-2.5 py-1 rounded-lg border border-[var(--color-border)]">
          {profile?.points ?? 0}T
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 animate-fade-in text-center">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[var(--color-border-warm)] mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={character.avatar_url} alt={character.name} className="w-full h-full object-cover" />
            </div>
            <p className="font-medium mb-1">{character.name}</p>
            <p className="text-[var(--color-text-muted)] text-sm">最初のメッセージを送ってみましょう</p>
            <p className="text-xs mt-2" style={{ color: 'var(--color-accent)' }}>AIがすぐに返事を書きます</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} characterName={character.name} characterAvatar={character.avatar_url} />
        ))}
        {isTyping && (
          <div className="flex items-end gap-2 animate-fade-in">
            <div className="w-7 h-7 rounded-full overflow-hidden border border-[var(--color-border)] flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={character.avatar_url} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bubble-operator px-4 py-3 flex items-center gap-2">
              <span className="text-[var(--color-text-muted)] text-xs">AIが返信中</span>
              <div className="flex gap-1">
                <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 py-3"
        style={{ borderTop: '1px solid var(--color-border)', background: 'rgba(23,18,13,0.95)' }}>
        {!canSend && (
          <div className="mb-3 rounded-xl p-3 text-center"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <p className="text-[var(--color-text-muted)] text-xs mb-1">トークンがありません</p>
            <Link href="/payment" className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
              トークンを購入してつづける →
            </Link>
          </div>
        )}
        {canSend && (
          <p className="text-[var(--color-text-muted)] text-xs mb-2">
            1トークン消費（残り{profile?.points ?? 0}T）
          </p>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder={canSend ? 'メッセージを送る…' : 'トークンが必要です'}
            disabled={!canSend}
            rows={1}
            className="flex-1 input-warm px-4 py-2.5 text-sm resize-none disabled:opacity-40"
            style={{ minHeight: '42px', maxHeight: '120px', lineHeight: '1.5' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending || !canSend}
            className="btn-primary p-2.5 flex-shrink-0 disabled:opacity-40"
            style={{ borderRadius: '10px' }}
          >
            <Send size={17} />
          </button>
        </div>
      </div>

      {/* アルバムオーバーレイ */}
      {showAlbum && (
        <div className="fixed inset-0 z-40 flex flex-col" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={character.avatar_url} alt="" className="w-full h-full object-cover" />
              </div>
              <p className="text-white font-semibold text-sm">{character.name}のフォト</p>
            </div>
            <button onClick={() => setShowAlbum(false)} className="p-2 text-white/70 hover:text-white">
              <X size={22} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-6">
            <div className="grid grid-cols-3 gap-1.5">
              {/* アバターも含む */}
              <div
                className="overflow-hidden rounded-xl cursor-pointer"
                style={{ aspectRatio: '1' }}
                onClick={() => openAlbumLightbox(0)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={character.avatar_url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              </div>
              {photos.map((photo, i) => (
                <div
                  key={photo.id}
                  className="overflow-hidden rounded-xl cursor-pointer"
                  style={{ aspectRatio: '1' }}
                  onClick={() => openAlbumLightbox(i + 1)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          photos={lightboxPhotos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      )}
    </div>
  )
}

function MessageBubble({ message, characterName, characterAvatar }: {
  message: Message; characterName: string; characterAvatar: string
}) {
  const isUser = message.sender_role === 'user'
  return (
    <div className={`flex items-end gap-2 animate-fade-up ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full overflow-hidden border border-[var(--color-border)] flex-shrink-0 mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={characterAvatar} alt={characterName} className="w-full h-full object-cover" />
        </div>
      )}
      <div className={`max-w-[78%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-2.5 text-sm leading-relaxed ${isUser ? 'bubble-user' : 'bubble-operator'}`}>
          {message.content}
        </div>
        <div className={`flex items-center gap-1.5 px-1 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="text-[var(--color-text-muted)] text-[11px]">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: ja })}
          </span>
          {isUser && message.is_read && (
            <span className="text-[11px]" style={{ color: 'var(--color-primary)' }}>既読</span>
          )}
          {!isUser && <span className="text-[11px] text-[var(--color-text-muted)]">AIより</span>}
        </div>
      </div>
    </div>
  )
}
