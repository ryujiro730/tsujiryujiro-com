'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Send, ChevronLeft, Images, X, Gift } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Character, Message, Profile, CharacterPhoto, UserItem } from '@/types'
import Link from 'next/link'
import Lightbox from '@/components/Lightbox'

const MAX_CACHED_MSGS = 60
const CHAT_ENABLED = process.env.NEXT_PUBLIC_CHAT_ENABLED !== 'false'

function readCache<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') } catch { return null }
}
function writeCache(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

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
  const [showGiftPanel, setShowGiftPanel] = useState(false)
  const [inventory, setInventory] = useState<UserItem[]>([])
  const [sendingItem, setSendingItem] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const supabaseRef = useRef(createClient())
  const channelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null)
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const convIdRef = useRef<string | null>(null)
  const supabase = supabaseRef.current

  const addMessage = useCallback((msg: Message) => {
    setMessages(prev => {
      if (prev.find(m => m.id === msg.id)) return prev
      const next = [...prev, msg]
      // Update cache with latest messages
      if (convIdRef.current) {
        writeCache(`msgs:${convIdRef.current}`, next.slice(-MAX_CACHED_MSGS))
      }
      return next
    })
  }, [])

  useEffect(() => {
    if (!characterId) { router.push('/characters'); return }
    loadData()
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [characterId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const setupRealtimeAndPolling = useCallback((convId: string, _userId: string) => {
    // 30秒ごとにフォールバックポーリング（最新メッセージ以降のみ取得）
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    pollIntervalRef.current = setInterval(async () => {
      const cid = convIdRef.current
      if (!cid) return
      setMessages(prev => {
        const lastCreatedAt = prev.length > 0 ? prev[prev.length - 1].created_at : new Date(0).toISOString()
        supabase
          .from('messages').select('*')
          .eq('conversation_id', cid)
          .gt('created_at', lastCreatedAt)
          .order('created_at', { ascending: true })
          .then(({ data }) => { if (data) data.forEach(m => addMessage(m)) })
        return prev
      })
    }, 30000)

    if (channelRef.current) supabase.removeChannel(channelRef.current)
    const channel = supabase.channel(`chat:${convId}`)

    channel.on('broadcast', { event: 'new_message' }, ({ payload }) => {
      const msg = payload.message as Message
      addMessage(msg)
      if (msg.sender_role === 'character') {
        setIsTyping(false)
        fetch('/api/chat/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: convIdRef.current }),
        }).catch(() => {})
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
      filter: `conversation_id=eq.${convId}`,
    }, (payload) => {
      const msg = payload.new as Message
      addMessage(msg)
      if (msg.sender_role === 'character') setIsTyping(false)
    })

    channelRef.current = channel
    channel.subscribe()
  }, [supabase, addMessage])

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.push('/auth/login'); return }
    const userId = session.user.id

    const charCache = readCache<Character>(`charData:${characterId}`)
    const cachedConvId = localStorage.getItem(`conv:${userId}:${characterId}`)

    if (charCache && cachedConvId) {
      // INSTANT: show cached UI immediately
      const cachedMsgs = readCache<Message[]>(`msgs:${cachedConvId}`) ?? []
      setCharacter(charCache)
      setMessages(cachedMsgs)
      setConversationId(cachedConvId)
      convIdRef.current = cachedConvId
      setLoading(false)

      // Background refresh
      const [profRes, charRes, photosRes, msgsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('characters').select('*').eq('id', characterId).single(),
        supabase.from('character_photos').select('*').eq('character_id', characterId).order('order_index'),
        supabase.from('messages').select('*').eq('conversation_id', cachedConvId).order('created_at', { ascending: true }),
      ])
      if (profRes.data) setProfile(profRes.data)
      if (charRes.data) {
        setCharacter(charRes.data)
        writeCache(`charData:${characterId}`, charRes.data)
      }
      if (photosRes.data) setPhotos(photosRes.data)
      if (msgsRes.data) {
        setMessages(msgsRes.data)
        writeCache(`msgs:${cachedConvId}`, msgsRes.data.slice(-MAX_CACHED_MSGS))
      }
      setupRealtimeAndPolling(cachedConvId, userId)
    } else {
      // 初回：start-conversationで会話を作成＆ウェルカムメッセージ
      const [profRes, charRes, photosRes, startRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('characters').select('*').eq('id', characterId).single(),
        supabase.from('character_photos').select('*').eq('character_id', characterId).order('order_index'),
        fetch('/api/chat/start-conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId }),
        }),
      ])
      setProfile(profRes.data)
      if (charRes.data) {
        setCharacter(charRes.data)
        writeCache(`charData:${characterId}`, charRes.data)
      }
      setPhotos(photosRes.data || [])

      if (!startRes.ok) { setLoading(false); return }
      const { conversationId: newConvId, welcomeMessage } = await startRes.json()
      localStorage.setItem(`conv:${userId}:${characterId}`, newConvId)

      const { data: msgs } = await supabase
        .from('messages').select('*')
        .eq('conversation_id', newConvId)
        .order('created_at', { ascending: true })

      const allMsgs = msgs || []
      if (welcomeMessage && !allMsgs.find((m: Message) => m.id === welcomeMessage.id)) {
        allMsgs.unshift(welcomeMessage)
      }
      setMessages(allMsgs)
      writeCache(`msgs:${newConvId}`, allMsgs.slice(-MAX_CACHED_MSGS))
      setConversationId(newConvId)
      convIdRef.current = newConvId
      setupRealtimeAndPolling(newConvId, userId)
      setLoading(false)
    }

    // mark as read (fire and forget)
    const cid = convIdRef.current
    if (cid) {
      fetch('/api/chat/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: cid }),
      }).catch(() => {})
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || sending || !conversationId || !profile || !character) return

    const SEND_COST = 100
    if (profile.points < SEND_COST) {
      alert(`メッセージ送信には${SEND_COST}ポイント必要です。ポイントを購入してください。`)
      return
    }

    setSending(true)
    const content = input.trim()
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    // ポイント消費
    const newPoints = profile.points - SEND_COST
    await Promise.all([
      supabase.from('profiles').update({ points: newPoints }).eq('id', profile.id),
      supabase.from('point_transactions').insert({
        user_id: profile.id,
        amount: -SEND_COST,
        type: 'spend',
        description: 'メッセージ送信',
      }),
    ])
    setProfile(prev => prev ? { ...prev, points: newPoints } : prev)
    window.dispatchEvent(new CustomEvent('pointsUpdated', { detail: { points: newPoints } }))

    // ユーザーメッセージをDBに保存
    const { data: msg } = await supabase.from('messages').insert({
      conversation_id: conversationId, sender_role: 'user',
      content, points_used: SEND_COST,
    }).select().single()

    if (!msg) { setSending(false); return }

    addMessage(msg)

    // 返信した → このキャラへの自動同報を即時キャンセル（fire-and-forget）
    fetch('/api/chat/cancel-broadcasts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId: character.id }),
    }).catch(() => {})

    await supabase.from('conversations').update({
      last_message_at: new Date().toISOString(), is_unread_staff: true,
    }).eq('id', conversationId)

    channelRef.current?.send({
      type: 'broadcast',
      event: 'new_message',
      payload: { message: msg },
    })

    setSending(false)

    // AI自動返信を非同期でリクエスト（isTypingで「入力中」表示）
    setIsTyping(true)
    try {
      const res = await fetch('/api/chat/ai-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          characterId: character.id,
          userMessage: content,
        }),
      })
      if (res.ok) {
        const { message: aiMsg } = await res.json()
        if (aiMsg) addMessage(aiMsg)
      } else {
        console.error('[chat] AI返信エラー:', await res.text())
      }
    } catch (err) {
      console.error('[chat] AI返信ネットワークエラー:', err)
    } finally {
      setIsTyping(false)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const openGiftPanel = async () => {
    if (showGiftPanel) { setShowGiftPanel(false); return }
    const res = await fetch('/api/items')
    if (res.ok) {
      const { inventory: inv } = await res.json()
      setInventory(inv.filter((i: UserItem) => i.quantity > 0))
    }
    setShowGiftPanel(true)
  }

  const sendItem = async (userItem: UserItem) => {
    if (!conversationId || sendingItem) return
    const item = userItem.item
    if (!item) return

    setSendingItem(userItem.item_id)
    const res = await fetch('/api/items/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: userItem.item_id, conversationId }),
    })
    const data = await res.json()

    if (res.ok && data.message) {
      addMessage(data.message)
      channelRef.current?.send({ type: 'broadcast', event: 'new_message', payload: { message: data.message } })
      setInventory(prev => prev
        .map(i => i.item_id === userItem.item_id ? { ...i, quantity: data.remainingQuantity } : i)
        .filter(i => i.quantity > 0)
      )
      setShowGiftPanel(false)

      // AI自動返信
      setIsTyping(true)
      try {
        const replyRes = await fetch('/api/chat/ai-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            characterId: character?.id,
            userMessage: `${item.name}を贈りました`,
          }),
        })
        if (replyRes.ok) {
          const { message: aiMsg } = await replyRes.json()
          if (aiMsg) addMessage(aiMsg)
        }
      } finally {
        setIsTyping(false)
      }
    } else {
      alert(data.error || 'アイテムの使用に失敗しました')
    }
    setSendingItem(null)
  }

  const openAlbumLightbox = async (index: number) => {
    if (!character || !profile) return

    const VIEW_COST = 300
    if (profile.points < VIEW_COST) {
      alert(`画像閲覧には${VIEW_COST}ポイント必要です。ポイントを購入してください。`)
      return
    }

    const newPoints = profile.points - VIEW_COST
    await Promise.all([
      supabase.from('profiles').update({ points: newPoints }).eq('id', profile.id),
      supabase.from('point_transactions').insert({
        user_id: profile.id,
        amount: -VIEW_COST,
        type: 'spend',
        description: '画像閲覧',
      }),
    ])
    setProfile(prev => prev ? { ...prev, points: newPoints } : prev)
    window.dispatchEvent(new CustomEvent('pointsUpdated', { detail: { points: newPoints } }))

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
        style={{ background: 'rgba(255, 245, 248, 0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--color-border)' }}>
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
            <p className="text-[var(--color-text-muted)] text-xs">オンライン</p>
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
        style={{ borderTop: '1px solid var(--color-border)', background: 'rgba(255, 245, 248, 0.97)' }}>
        {CHAT_ENABLED ? (
          <div className="flex gap-2 items-end">
            <button
              onClick={openGiftPanel}
              className={`p-2.5 flex-shrink-0 rounded-[10px] transition-colors ${showGiftPanel ? 'text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
              style={showGiftPanel ? { background: 'var(--color-primary)' } : {}}
              title="ギフトを贈る"
            >
              <Gift size={17} />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="メッセージを送る…"
              rows={1}
              className="flex-1 input-warm px-4 py-2.5 text-sm resize-none"
              style={{ minHeight: '42px', maxHeight: '120px', lineHeight: '1.5' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="btn-primary p-2.5 flex-shrink-0 disabled:opacity-40"
              style={{ borderRadius: '10px' }}
            >
              <Send size={17} />
            </button>
          </div>
        ) : (
          <div className="rounded-2xl px-4 py-3 text-center"
            style={{ background: 'linear-gradient(135deg, rgba(249,168,184,0.15), rgba(232,121,160,0.08))', border: '1px solid var(--color-border-warm)' }}>
            <p className="text-sm font-bold mb-0.5">🎀 早期登録キャンペーン受付中</p>
            <p className="text-xs text-[var(--color-text-muted)]">サービス開始時にいち早くご連絡します。もうしばらくお待ちください！</p>
          </div>
        )}
      </div>

      {/* ギフトパネル */}
      {showGiftPanel && (
        <div className="flex-shrink-0 px-4 pb-3" style={{ background: 'rgba(255, 245, 248, 0.97)' }}>
          <div className="rounded-2xl p-3" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-warm)' }}>
            <p className="text-xs font-semibold text-[var(--color-text-muted)] mb-2.5 flex items-center gap-1.5">
              <Gift size={12} />
              ギフトを選択
            </p>
            {inventory.length === 0 ? (
              <div className="text-center py-3">
                <p className="text-xs text-[var(--color-text-muted)] mb-2">ギフトがありません</p>
                <a href="/shop" className="text-xs text-[var(--color-primary)] underline-offset-2 hover:underline">
                  ショップで購入する →
                </a>
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {inventory.map((userItem) => {
                  const item = userItem.item
                  if (!item) return null
                  return (
                    <button
                      key={userItem.item_id}
                      onClick={() => sendItem(userItem)}
                      disabled={!!sendingItem}
                      className="flex-shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-xl transition-colors disabled:opacity-50"
                      style={{ minWidth: '72px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                    >
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image_url} alt={item.name} className="w-12 h-12 object-cover rounded-lg" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-surface-2)' }}>
                          <Gift size={20} className="text-[var(--color-text-muted)]" />
                        </div>
                      )}
                      <span className="text-[10px] text-center leading-tight line-clamp-2" style={{ color: 'var(--color-text)' }}>{item.name}</span>
                      <span className="text-[10px] text-[var(--color-text-muted)]">×{userItem.quantity}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

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
  const isItem = !!message.metadata?.item_id
  const hasBroadcastImage = !isItem && !!message.metadata?.image_url

  return (
    <div className={`flex items-end gap-2 animate-fade-up ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full overflow-hidden border border-[var(--color-border)] flex-shrink-0 mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={characterAvatar} alt={characterName} className="w-full h-full object-cover" />
        </div>
      )}
      <div className={`max-w-[78%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        {isItem ? (
          <div className={`px-3 py-2.5 rounded-2xl flex items-center gap-2.5 ${isUser ? 'bubble-user' : 'bubble-operator'}`}>
            {message.metadata?.item_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={message.metadata.item_image_url}
                alt={message.metadata.item_name ?? ''}
                className="w-12 h-12 object-cover rounded-xl flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <Gift size={20} />
              </div>
            )}
            <div>
              <p className="text-[10px] opacity-70 mb-0.5">ギフト</p>
              <p className="text-sm font-semibold">{message.metadata?.item_name}</p>
              <p className="text-[11px] opacity-70 mt-0.5">を贈りました</p>
            </div>
          </div>
        ) : hasBroadcastImage ? (
          <div className={`rounded-2xl overflow-hidden ${isUser ? 'bubble-user' : 'bubble-operator'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={message.metadata!.image_url!} alt="" className="w-full max-w-[240px] object-cover block" />
            {message.content && (
              <p className="px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
        ) : (
          <div className={`px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'bubble-user' : 'bubble-operator'}`}>
            {message.content}
          </div>
        )}
        <div className={`flex items-center gap-1.5 px-1 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="text-[var(--color-text-muted)] text-[11px]">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: ja })}
          </span>
          {isUser && message.is_read && (
            <span className="text-[11px]" style={{ color: 'var(--color-primary)' }}>既読</span>
          )}
        </div>
      </div>
    </div>
  )
}
