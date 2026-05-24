'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Send, ChevronLeft, Images, X, Gift, ImagePlus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Character, Message, Profile, CharacterPhoto, UserItem } from '@/types'
import Link from 'next/link'
import Image from 'next/image'
import Lightbox from '@/components/Lightbox'
import { PointsShortageDialog } from '@/components/PointsShortageDialog'

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
  const [charLimitReached, setCharLimitReached] = useState(false)
  const [showItemPromoDialog, setShowItemPromoDialog] = useState(false)
  const [showSharePromoDialog, setShowSharePromoDialog] = useState(false)
  const [imageLightboxUrl, setImageLightboxUrl] = useState<string | null>(null)
  const [sendingPhoto, setSendingPhoto] = useState(false)
  const [pointsShortage, setPointsShortage] = useState<{ current: number; required: number } | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
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
        supabase.from('messages').select('*').eq('conversation_id', cachedConvId).eq('is_deleted', false).order('created_at', { ascending: true }),
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
        .eq('is_deleted', false)
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

    // user_characters を retroactively populate（カウント表示の正規化・fire-and-forget）
    if (characterId) {
      fetch('/api/chat/activate-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId }),
      }).catch(() => {})
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

    const SEND_COST = 15
    const now = new Date()
    const bonusAvailable =
      profile.bonus_points_expires_at && new Date(profile.bonus_points_expires_at) > now
        ? (profile.bonus_points ?? 0)
        : 0
    const totalPoints = profile.points + bonusAvailable
    if (totalPoints < SEND_COST) {
      setPointsShortage({ current: totalPoints, required: SEND_COST })
      return
    }

    // 初回メッセージの場合はキャラクター枠のチェック
    const isFirstUserMessage = !messages.some(m => m.sender_role === 'user')
    if (isFirstUserMessage) {
      const activateRes = await fetch('/api/chat/activate-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: character.id }),
      })
      const activateData = await activateRes.json()
      if (!activateData.ok) {
        setCharLimitReached(true)
        return
      }
    }

    setSending(true)
    const content = input.trim()
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    // ポイント消費（ボーナスptから先に引く）
    const bonusDeduct = Math.min(bonusAvailable, SEND_COST)
    const regularDeduct = SEND_COST - bonusDeduct
    const newBonusPoints = bonusAvailable - bonusDeduct
    const newPoints = profile.points - regularDeduct
    const updatePayload: Record<string, number> = { points: newPoints }
    if (bonusDeduct > 0) updatePayload.bonus_points = newBonusPoints
    await Promise.all([
      supabase.from('profiles').update(updatePayload).eq('id', profile.id),
      supabase.from('point_transactions').insert({
        user_id: profile.id,
        amount: -SEND_COST,
        type: 'spend',
        description: 'メッセージ送信',
      }),
    ])
    setProfile(prev => prev ? { ...prev, points: newPoints, bonus_points: newBonusPoints } : prev)
    window.dispatchEvent(new CustomEvent('pointsUpdated', { detail: { points: newPoints + newBonusPoints } }))

    // ユーザーメッセージをDBに保存
    const { data: msg } = await supabase.from('messages').insert({
      conversation_id: conversationId, sender_role: 'user',
      content, points_used: SEND_COST,
    }).select().single()

    if (!msg) { setSending(false); return }

    // プロモーションダイアログのトリガー（初回のみ）
    const userMsgCount = messages.filter(m => m.sender_role === 'user').length + 1
    if (userMsgCount === 2 && !localStorage.getItem(`shown_item_dialog:${characterId}`)) {
      localStorage.setItem(`shown_item_dialog:${characterId}`, '1')
      setTimeout(() => setShowItemPromoDialog(true), 1500)
    }
    if (userMsgCount === 3 && !localStorage.getItem(`shown_share_dialog:${characterId}`)) {
      localStorage.setItem(`shown_share_dialog:${characterId}`, '1')
      setTimeout(() => setShowSharePromoDialog(true), 1500)
    }

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

    const VIEW_COST = 30
    const nowV = new Date()
    const bonusAvailableV =
      profile.bonus_points_expires_at && new Date(profile.bonus_points_expires_at) > nowV
        ? (profile.bonus_points ?? 0)
        : 0
    const totalPointsV = profile.points + bonusAvailableV
    if (totalPointsV < VIEW_COST) {
      setPointsShortage({ current: totalPointsV, required: VIEW_COST })
      return
    }

    const bonusDeductV = Math.min(bonusAvailableV, VIEW_COST)
    const regularDeductV = VIEW_COST - bonusDeductV
    const newBonusPointsV = bonusAvailableV - bonusDeductV
    const newPoints = profile.points - regularDeductV
    const updatePayloadV: Record<string, number> = { points: newPoints }
    if (bonusDeductV > 0) updatePayloadV.bonus_points = newBonusPointsV
    await Promise.all([
      supabase.from('profiles').update(updatePayloadV).eq('id', profile.id),
      supabase.from('point_transactions').insert({
        user_id: profile.id,
        amount: -VIEW_COST,
        type: 'spend',
        description: '画像閲覧',
      }),
    ])
    setProfile(prev => prev ? { ...prev, points: newPoints, bonus_points: newBonusPointsV } : prev)
    window.dispatchEvent(new CustomEvent('pointsUpdated', { detail: { points: newPoints + newBonusPointsV } }))

    const all = [character.avatar_url, ...photos.map(p => p.url)]
    setLightboxPhotos(all)
    setLightboxIndex(index)
    setShowAlbum(false)
  }

  const sendPhoto = async (file: File) => {
    if (sendingPhoto || !conversationId || !profile || !character) return

    const PHOTO_COST = 15
    const now = new Date()
    const bonusAvailable =
      profile.bonus_points_expires_at && new Date(profile.bonus_points_expires_at) > now
        ? (profile.bonus_points ?? 0)
        : 0
    const totalPoints = profile.points + bonusAvailable
    if (totalPoints < PHOTO_COST) {
      setPointsShortage({ current: totalPoints, required: PHOTO_COST })
      return
    }

    setSendingPhoto(true)
    const supabase = supabaseRef.current

    // Supabase Storageにアップロード
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `user-photos/${profile.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('chat-images').upload(path, file, { upsert: false })
    if (uploadError) {
      alert('画像のアップロードに失敗しました')
      setSendingPhoto(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('chat-images').getPublicUrl(path)

    // ポイント消費
    const bonusDeduct = Math.min(bonusAvailable, PHOTO_COST)
    const regularDeduct = PHOTO_COST - bonusDeduct
    const newBonusPoints = bonusAvailable - bonusDeduct
    const newPoints = profile.points - regularDeduct
    const updatePayload: Record<string, number> = { points: newPoints }
    if (bonusDeduct > 0) updatePayload.bonus_points = newBonusPoints
    await Promise.all([
      supabase.from('profiles').update(updatePayload).eq('id', profile.id),
      supabase.from('point_transactions').insert({
        user_id: profile.id, amount: -PHOTO_COST, type: 'spend', description: '写真送信',
      }),
    ])
    setProfile(prev => prev ? { ...prev, points: newPoints, bonus_points: newBonusPoints } : prev)
    window.dispatchEvent(new CustomEvent('pointsUpdated', { detail: { points: newPoints + newBonusPoints } }))

    // メッセージとして保存
    const { data: msg } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_role: 'user',
      content: '',
      points_used: PHOTO_COST,
      metadata: { image_url: publicUrl },
    }).select().single()

    if (msg) {
      setMessages(prev => [...prev.slice(-MAX_CACHED_MSGS + 1), msg])
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }

    setSendingPhoto(false)
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
    <div className="fixed flex flex-col" style={{ top: '52px', left: 0, right: 0, bottom: 0 }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ background: 'rgba(255, 245, 248, 0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--color-border)' }}>
        <Link href="/characters" className="p-1 -ml-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
          <ChevronLeft size={22} />
        </Link>
        <Link href={`/characters/${character.id}`}>
          <div className="relative w-9 h-9 rounded-full overflow-hidden border border-[var(--color-border-warm)] flex-shrink-0">
            <Image src={character.avatar_url} alt={character.name} fill className="object-cover" sizes="36px" />
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
            <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[var(--color-border-warm)] mb-4">
              <Image src={character.avatar_url} alt={character.name} fill className="object-cover" sizes="80px" />
            </div>
            <p className="font-medium mb-1">{character.name}</p>
            <p className="text-[var(--color-text-muted)] text-sm">最初のメッセージを送ってみましょう</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} characterName={character.name} characterAvatar={character.avatar_url} onImageClick={setImageLightboxUrl} />
        ))}
        {isTyping && (
          <div className="flex items-end gap-2 animate-fade-in">
            <div className="relative w-7 h-7 rounded-full overflow-hidden border border-[var(--color-border)] flex-shrink-0">
              <Image src={character.avatar_url} alt="" fill className="object-cover" sizes="28px" />
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
          charLimitReached ? (
            <div className="rounded-2xl px-4 py-4" style={{ background: 'linear-gradient(135deg, rgba(249,168,184,0.12), rgba(232,121,160,0.06))', border: '1px solid var(--color-border-warm)' }}>
              <p className="text-sm font-bold mb-1 text-center" style={{ color: 'var(--color-text)' }}>🔒 キャラクター枠が上限です</p>
              <p className="text-xs text-center mb-3" style={{ color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                300ptで開放するか、Xでシェアすると無料で追加解放できます
              </p>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch('/api/points/unlock-character', { method: 'POST' })
                  const data = await res.json()
                  if (data.ok) {
                    setCharLimitReached(false)
                    router.refresh()
                  } else {
                    alert(data.message ?? 'ポイントが不足しています（必要: 300pt）')
                  }
                }}
                className="btn-primary w-full py-3 mb-2 flex items-center justify-center gap-2"
                style={{ fontSize: '14px' }}
              >
                🔓 300ptで開放する
              </button>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('AIと本当のカップルみたいに話せる！#アイカノ を試してみたよ → https://aikano.chat')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 flex items-center justify-center gap-2 rounded-xl text-sm"
                style={{ textDecoration: 'none', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                Xでシェアして無料解放
              </a>
              <p className="text-[11px] text-center mt-1.5" style={{ color: 'var(--color-text-muted)' }}>シェア後、設定ページからURLを送信してください</p>
            </div>
          ) : (
          <form autoComplete="off" onSubmit={e => e.preventDefault()} className="flex gap-2 items-end">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { sendPhoto(f); e.target.value = '' } }}
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={sendingPhoto}
              className="p-2.5 flex-shrink-0 rounded-[10px] transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-40"
              title="写真を送る (15pt)"
            >
              <ImagePlus size={17} />
            </button>
            <button
              type="button"
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
              name="message"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              className="flex-1 input-warm px-4 py-2.5 resize-none"
              style={{ minHeight: '42px', maxHeight: '120px', lineHeight: '1.5', fontSize: '16px' }}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="btn-primary p-2.5 flex-shrink-0 disabled:opacity-40"
              style={{ borderRadius: '10px' }}
            >
              <Send size={17} />
            </button>
          </form>
          )
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
              <div className="relative w-8 h-8 rounded-full overflow-hidden">
                <Image src={character.avatar_url} alt="" fill className="object-cover" sizes="32px" />
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
                className="relative overflow-hidden rounded-xl cursor-pointer"
                style={{ aspectRatio: '1' }}
                onClick={() => openAlbumLightbox(0)}
              >
                <Image src={character.avatar_url} alt="" fill className="object-cover hover:scale-105 transition-transform duration-300" sizes="33vw" />
              </div>
              {photos.map((photo, i) => (
                <div
                  key={photo.id}
                  className="relative overflow-hidden rounded-xl cursor-pointer"
                  style={{ aspectRatio: '1' }}
                  onClick={() => openAlbumLightbox(i + 1)}
                >
                  <Image src={photo.url} alt="" fill className="object-cover hover:scale-105 transition-transform duration-300" sizes="33vw" />
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

      {/* チャット内画像タップのライトボックス */}
      {imageLightboxUrl && (
        <Lightbox
          photos={[imageLightboxUrl]}
          index={0}
          onClose={() => setImageLightboxUrl(null)}
          onChange={() => {}}
        />
      )}

      {/* アニメーション定義 */}
      <style>{`
        @keyframes promoFloatHeart {
          0%   { transform: translateY(0) scale(1) rotate(-10deg); opacity: 0.9; }
          100% { transform: translateY(-220px) scale(0.2) rotate(20deg); opacity: 0; }
        }
        @keyframes promoConfetti {
          0%   { transform: translateY(-10px) rotate(0deg) scaleX(1); opacity: 1; }
          80%  { opacity: 0.8; }
          100% { transform: translateY(110vh) rotate(800deg) scaleX(0.4); opacity: 0; }
        }
        @keyframes promoDialogIn {
          0%   { transform: scale(0.75) translateY(40px); opacity: 0; }
          65%  { transform: scale(1.05) translateY(-5px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes promoGiftBounce {
          0%, 100% { transform: translateY(0) rotate(-4deg) scale(1); }
          50%       { transform: translateY(-10px) rotate(4deg) scale(1.08); }
        }
        @keyframes promoPulseRing {
          0%   { box-shadow: 0 4px 16px rgba(0,0,0,0.2), 0 0 0 0 rgba(255,255,255,0.6); }
          70%  { box-shadow: 0 4px 16px rgba(0,0,0,0.2), 0 0 0 10px rgba(255,255,255,0); }
          100% { box-shadow: 0 4px 16px rgba(0,0,0,0.2), 0 0 0 0 rgba(255,255,255,0); }
        }
        @keyframes promoCracker {
          0%   { transform: scale(0) rotate(-25deg); opacity: 0; }
          55%  { transform: scale(1.25) rotate(8deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes promoShimmer {
          0%, 100% { opacity: 0.85; }
          50%       { opacity: 1; }
        }
      `}</style>

      {/* アイテム贈呈プロモーションダイアログ（2通目） */}
      {showItemPromoDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5"
          style={{ background: 'rgba(15,5,10,0.72)', backdropFilter: 'blur(6px)' }}>

          {/* 浮かぶハート */}
          {[12, 28, 50, 72, 88].map((left, i) => (
            <div key={i} style={{
              position: 'fixed', bottom: '30%', left: `${left}%`,
              fontSize: `${14 + i * 5}px`, pointerEvents: 'none', zIndex: 51,
              animation: `promoFloatHeart ${1.8 + i * 0.35}s ease-out ${i * 0.25}s infinite`,
            }}>❤️</div>
          ))}

          <div style={{ position: 'relative', width: '100%', maxWidth: '360px', zIndex: 52,
            animation: 'promoDialogIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
            <div style={{
              background: 'linear-gradient(150deg, #fff5f8 0%, #fde8f2 100%)',
              borderRadius: '24px',
              border: '1.5px solid rgba(232,67,143,0.3)',
              boxShadow: '0 24px 64px rgba(232,67,143,0.28), 0 8px 24px rgba(0,0,0,0.12)',
              overflow: 'hidden',
            }}>

              {/* ヘッダー */}
              <div style={{
                background: 'linear-gradient(135deg, #e8438f 0%, #c0306e 100%)',
                padding: '22px 20px 36px', position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: '-24px', right: '-24px', width: '90px', height: '90px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', bottom: '-12px', left: '25%', width: '64px', height: '64px', background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
                <button onClick={() => setShowItemPromoDialog(false)} style={{
                  position: 'absolute', top: '12px', right: '12px',
                  background: 'rgba(255,255,255,0.22)', border: 'none', borderRadius: '50%',
                  width: '30px', height: '30px', cursor: 'pointer', color: 'white',
                  fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>✕</button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    position: 'relative', width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden',
                    border: '3px solid rgba(255,255,255,0.85)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                    marginBottom: '10px',
                    animation: 'promoPulseRing 1.8s ease-out infinite',
                  }}>
                    {character?.avatar_url && <Image src={character.avatar_url} alt={character.name ?? ''} fill className="object-cover" sizes="72px" />}
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: 600 }}>
                    {character?.name}からのお願い 💕
                  </p>
                </div>
              </div>

              {/* ギフトボックス */}
              <div style={{ marginTop: '-24px', display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{
                  width: '68px', height: '68px', background: 'white',
                  borderRadius: '16px', border: '2px solid rgba(232,67,143,0.22)',
                  boxShadow: '0 8px 28px rgba(232,67,143,0.22)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '38px',
                  animation: 'promoGiftBounce 2.2s ease-in-out infinite',
                }}>🎁</div>
              </div>

              {/* テキスト＆アクション */}
              <div style={{ padding: '14px 24px 24px', textAlign: 'center' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text)', marginBottom: '8px', lineHeight: 1.45 }}>
                  もっと仲良くなるために<br />
                  <span style={{ color: 'var(--color-primary)' }}>アイテムを贈りませんか？</span>
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '18px', lineHeight: 1.7 }}>
                  {character?.name}にプレゼントを贈って<br />親密度をアップさせましょう！
                </p>

                {/* アイテムプレビュー */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
                  {[
                    { emoji: '💐', label: '花束', pts: '100' },
                    { emoji: '🌹', label: 'バラ', pts: '200' },
                    { emoji: '💍', label: '指輪', pts: '1000' },
                  ].map(item => (
                    <div key={item.label} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                      padding: '10px 14px',
                      background: 'white', borderRadius: '12px',
                      border: '1px solid rgba(232,67,143,0.15)',
                      boxShadow: '0 2px 8px rgba(232,67,143,0.08)',
                    }}>
                      <span style={{ fontSize: '24px' }}>{item.emoji}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text)' }}>{item.label}</span>
                      <span style={{ fontSize: '10px', color: 'var(--color-primary)', fontWeight: 700 }}>{item.pts}pt</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => { setShowItemPromoDialog(false); openGiftPanel() }}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, #e8438f 0%, #b5267f 100%)',
                    color: 'white', fontSize: '15px', fontWeight: 700, border: 'none',
                    cursor: 'pointer', boxShadow: '0 6px 20px rgba(232,67,143,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    marginBottom: '10px',
                    animation: 'promoShimmer 2s ease-in-out infinite',
                  }}
                >
                  🎁 ギフトを贈る
                </button>
                <button
                  onClick={() => setShowItemPromoDialog(false)}
                  style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-muted)' }}
                >
                  今はやめておく
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Xシェアプロモーションダイアログ（3通目） */}
      {showSharePromoDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5"
          style={{ background: 'rgba(10,5,20,0.72)', backdropFilter: 'blur(6px)' }}>

          {/* クラッカー紙吹雪 */}
          {Array.from({ length: 28 }).map((_, i) => {
            const palette = ['#e8438f', '#A060E0', '#FFD700', '#FF6B9D', '#7B2FBE', '#FF9ECE', '#54C0FF', '#FFA940']
            const color = palette[i % palette.length]
            const isRect = i % 3 !== 0
            const size = 5 + (i % 5) * 3
            return (
              <div key={i} style={{
                position: 'fixed', top: '-8px', left: `${(i * 3.8) % 100}%`,
                width: `${size}px`, height: isRect ? `${size * 0.45}px` : `${size}px`,
                background: color,
                borderRadius: isRect ? '2px' : '50%',
                animation: `promoConfetti ${1.4 + (i % 6) * 0.28}s ease-in ${(i * 0.07) % 1.4}s infinite`,
                pointerEvents: 'none', zIndex: 51,
              }} />
            )
          })}

          {/* 浮かぶハート */}
          {[10, 32, 68, 88].map((left, i) => (
            <div key={i} style={{
              position: 'fixed', bottom: '18%', left: `${left}%`,
              fontSize: `${18 + i * 6}px`, pointerEvents: 'none', zIndex: 51,
              animation: `promoFloatHeart ${2.2 + i * 0.4}s ease-out ${i * 0.35}s infinite`,
            }}>{'💕🌸💖💝'[i]}</div>
          ))}

          <div style={{ position: 'relative', width: '100%', maxWidth: '360px', zIndex: 52,
            animation: 'promoDialogIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
            <div style={{
              background: 'linear-gradient(150deg, #fff5f8 0%, #f3e8ff 100%)',
              borderRadius: '24px',
              border: '1.5px solid rgba(160,96,224,0.3)',
              boxShadow: '0 24px 64px rgba(160,96,224,0.25), 0 8px 24px rgba(232,67,143,0.18)',
              overflow: 'hidden',
            }}>

              {/* ヘッダー */}
              <div style={{
                background: 'linear-gradient(135deg, #e8438f 0%, #A060E0 100%)',
                padding: '28px 20px 22px', textAlign: 'center', position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: '-24px', right: '-24px', width: '90px', height: '90px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', bottom: '-16px', left: '-16px', width: '70px', height: '70px', background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
                <button onClick={() => setShowSharePromoDialog(false)} style={{
                  position: 'absolute', top: '12px', right: '12px',
                  background: 'rgba(255,255,255,0.22)', border: 'none', borderRadius: '50%',
                  width: '30px', height: '30px', cursor: 'pointer', color: 'white',
                  fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>✕</button>
                <div style={{ fontSize: '52px', marginBottom: '10px', animation: 'promoCracker 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
                  🎉
                </div>
                <p style={{ color: 'rgba(255,255,255,0.92)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em' }}>
                  🌟 SPECIAL BONUS 🌟
                </p>
              </div>

              {/* コンテンツ */}
              <div style={{ padding: '20px 24px 24px', textAlign: 'center' }}>
                <h2 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--color-text)', marginBottom: '6px', lineHeight: 1.45 }}>
                  会話が弾んでるね！<br />
                  <span style={{ background: 'linear-gradient(to right, #e8438f, #A060E0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    特別ボーナス発生！
                  </span>
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '18px', lineHeight: 1.65 }}>
                  Xでシェアして <strong style={{ color: 'var(--color-primary)' }}>500pt</strong> &amp; 新キャラ解放権をGET！
                </p>

                {/* ベネフィットカード */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                  <div style={{
                    background: 'white', borderRadius: '14px', padding: '14px 10px',
                    border: '1.5px solid rgba(232,67,143,0.2)',
                    boxShadow: '0 3px 12px rgba(232,67,143,0.1)',
                  }}>
                    <div style={{ fontSize: '30px', marginBottom: '6px' }}>🪙</div>
                    <p style={{ fontSize: '14px', fontWeight: 800, color: '#c0306e', marginBottom: '2px' }}>500pt無料</p>
                    <p style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>シェアで即付与</p>
                  </div>
                  <div style={{
                    background: 'white', borderRadius: '14px', padding: '14px 10px',
                    border: '1.5px solid rgba(160,96,224,0.22)',
                    boxShadow: '0 3px 12px rgba(160,96,224,0.1)',
                  }}>
                    <div style={{ fontSize: '30px', marginBottom: '6px' }}>🔓</div>
                    <p style={{ fontSize: '13px', fontWeight: 800, color: '#7B2FBE', lineHeight: 1.3, marginBottom: '2px' }}>シークレット<br />キャラ解放</p>
                  </div>
                </div>

                {/* Xシェアボタン */}
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('AIカノと楽しくお喋り中！本当のカップルみたいに話せる✨ #アイカノ → https://aikano.chat')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowSharePromoDialog(false)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    width: '100%', padding: '15px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, #e8438f 0%, #A060E0 100%)',
                    color: 'white', fontSize: '15px', fontWeight: 800, textDecoration: 'none',
                    boxShadow: '0 8px 24px rgba(160,96,224,0.4)',
                    marginBottom: '10px',
                    animation: 'promoShimmer 2s ease-in-out infinite',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Xでシェアする
                </a>
                <button
                  onClick={() => setShowSharePromoDialog(false)}
                  style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-muted)' }}
                >
                  今はやめておく
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ポイント不足ダイアログ */}
      {pointsShortage && (
        <PointsShortageDialog
          currentPoints={pointsShortage.current}
          requiredPoints={pointsShortage.required}
          onClose={() => setPointsShortage(null)}
        />
      )}
    </div>
  )
}

function MessageBubble({ message, characterName, characterAvatar, onImageClick }: {
  message: Message; characterName: string; characterAvatar: string; onImageClick?: (url: string) => void
}) {
  const isUser = message.sender_role === 'user'
  const isItem = !!message.metadata?.item_id
  const hasBroadcastImage = !isItem && !!message.metadata?.image_url

  return (
    <div className={`flex items-end gap-2 animate-fade-up ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="relative w-7 h-7 rounded-full overflow-hidden border border-[var(--color-border)] flex-shrink-0 mb-4">
          <Image src={characterAvatar} alt={characterName} fill className="object-cover" sizes="28px" />
        </div>
      )}
      <div className={`max-w-[78%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        {isItem ? (
          <div className={`px-3 py-2.5 rounded-2xl flex items-center gap-2.5 ${isUser ? 'bubble-user' : 'bubble-operator'}`}>
            {message.metadata?.item_image_url ? (
              <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                <Image src={message.metadata.item_image_url} alt={message.metadata.item_name ?? ''} fill className="object-cover" sizes="48px" />
              </div>
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
            <div className="relative w-[240px] cursor-pointer" style={{ aspectRatio: '4/3' }} onClick={() => onImageClick?.(message.metadata!.image_url!)}>
              <Image src={message.metadata!.image_url!} alt="" fill className="object-cover" sizes="240px" />
            </div>
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
