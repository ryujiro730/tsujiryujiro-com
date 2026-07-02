'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Send, ChevronLeft, Images, X, ImagePlus, VideoIcon } from 'lucide-react'
import type { Character, Message, Profile, CharacterPhoto } from '@/types'
import Link from 'next/link'
import Image from 'next/image'
import Lightbox from '@/components/Lightbox'
import { compressImage } from '@/lib/compress-image'
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

  const [imageLightboxUrl, setImageLightboxUrl] = useState<string | null>(null)
  const [sendingPhoto, setSendingPhoto] = useState(false)
  const [sendingVideo, setSendingVideo] = useState(false)
  const [pendingMedia, setPendingMedia] = useState<{ file: File; mediaType: 'photo' | 'video'; previewUrl: string } | null>(null)
  const [pointsShortage, setPointsShortage] = useState<{ current: number; required: number } | null>(null)
  const [unlockedVideos, setUnlockedVideos] = useState<Set<string>>(new Set())

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
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

    // 解錠済み動画を取得
    const { data: unlocks } = await supabase.from('video_unlocks').select('message_id').eq('user_id', userId)
    if (unlocks) setUnlockedVideos(new Set(unlocks.map(u => u.message_id)))

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

    const SEND_COST = 0

    // 初回メッセージの場合はキャラクターを登録
    const isFirstUserMessage = !messages.some(m => m.sender_role === 'user')
    if (isFirstUserMessage) {
      fetch('/api/chat/activate-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: character.id }),
      }).catch(() => {})
    }

    setSending(true)
    const content = input.trim()
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'


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

  const openAlbumLightbox = async (index: number) => {
    if (!character || !profile) return

    const all = [character.avatar_url, ...photos.map(p => p.url)]
    setLightboxPhotos(all)
    setLightboxIndex(index)
    setShowAlbum(false)
  }

  const sendMedia = async (file: File, mediaType: 'photo' | 'video') => {
    if (!conversationId || !profile || !character) return
    if (mediaType === 'photo' && sendingPhoto) return
    if (mediaType === 'video' && sendingVideo) return

    if (mediaType === 'photo') setSendingPhoto(true)
    else setSendingVideo(true)

    const supabase = supabaseRef.current
    const folder = mediaType === 'video' ? 'user-videos' : 'user-photos'

    let uploadBlob: Blob = file
    let uploadContentType = file.type
    let uploadExt = file.name.split('.').pop() ?? (mediaType === 'video' ? 'mp4' : 'jpg')

    if (mediaType === 'photo') {
      const { blob } = await compressImage(file)
      uploadBlob = blob
      uploadContentType = 'image/webp'
      uploadExt = 'webp'
    }

    const path = `${folder}/${profile.id}/${Date.now()}.${uploadExt}`

    const { error: uploadError } = await supabase.storage.from('chat-images').upload(path, uploadBlob, { upsert: false, contentType: uploadContentType })
    if (uploadError) {
      alert(mediaType === 'video' ? '動画のアップロードに失敗しました' : '画像のアップロードに失敗しました')
      if (mediaType === 'photo') setSendingPhoto(false)
      else setSendingVideo(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('chat-images').getPublicUrl(path)

    // メッセージ保存・ポイント消費をサーバーサイドAPIで実行（service roleでmetadataを確実に保存）
    const res = await fetch('/api/chat/send-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, mediaUrl: publicUrl, mediaType }),
    })
    const data = await res.json()

    if (res.status === 402) {
      setPointsShortage({ current: data.current, required: data.required })
    } else if (res.ok && data.message) {
      const msg = data.message
      setMessages(prev => [...prev.slice(-MAX_CACHED_MSGS + 1), msg])
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      if (data.newPoints !== undefined) {
        setProfile(prev => prev ? { ...prev, points: data.newPoints } : prev)
        window.dispatchEvent(new CustomEvent('pointsUpdated', { detail: { points: data.newPoints } }))
      }
      channelRef.current?.send({ type: 'broadcast', event: 'new_message', payload: { message: msg } })
    } else {
      alert('送信に失敗しました')
    }

    if (mediaType === 'photo') setSendingPhoto(false)
    else setSendingVideo(false)
  }

  const stageMedia = (file: File, mediaType: 'photo' | 'video') => {
    const previewUrl = URL.createObjectURL(file)
    setPendingMedia({ file, mediaType, previewUrl })
  }

  const cancelPendingMedia = () => {
    if (pendingMedia) URL.revokeObjectURL(pendingMedia.previewUrl)
    setPendingMedia(null)
  }

  const sendPendingOrText = async () => {
    if (pendingMedia) {
      const { file, mediaType, previewUrl } = pendingMedia
      setPendingMedia(null)
      URL.revokeObjectURL(previewUrl)
      await sendMedia(file, mediaType)
    } else {
      await sendMessage()
    }
  }

  const unlockVideo = async (messageId: string) => {
    const res = await fetch('/api/chat/unlock-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId }),
    })
    const data = await res.json()
    if (res.ok) {
      setUnlockedVideos(prev => { const s = new Set(prev); s.add(messageId); return s })
      if (data.newPoints !== undefined) {
        setProfile(prev => prev ? { ...prev, points: data.newPoints } : prev)
        window.dispatchEvent(new CustomEvent('pointsUpdated', { detail: { points: data.newPoints } }))
      }
    } else if (res.status === 402) {
      setPointsShortage({ current: data.current, required: data.required })
    } else {
      alert('解錠に失敗しました')
    }
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
          <MessageBubble key={msg.id} message={msg} characterName={character.name} characterAvatar={character.avatar_url} onImageClick={setImageLightboxUrl} unlockedVideos={unlockedVideos} onUnlockVideo={unlockVideo} />
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
          <div className="flex flex-col gap-2">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { stageMedia(f, 'photo'); e.target.value = '' } }}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { stageMedia(f, 'video'); e.target.value = '' } }}
            />
            {/* メディアプレビュー */}
            {pendingMedia && (
              <div className="flex items-center gap-2 px-1">
                <div className="relative rounded-xl overflow-hidden flex-shrink-0" style={{ width: 64, height: 64 }}>
                  {pendingMedia.mediaType === 'photo' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pendingMedia.previewUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--color-surface-2)' }}>
                      <VideoIcon size={24} className="text-[var(--color-text-muted)]" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{pendingMedia.file.name}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {pendingMedia.mediaType === 'photo' ? '15pt' : '30pt'} · 送信ボタンで送る
                  </p>
                </div>
                <button
                  type="button"
                  onClick={cancelPendingMedia}
                  className="p-1.5 rounded-full flex-shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  style={{ background: 'var(--color-surface-2)' }}
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <form autoComplete="off" onSubmit={e => e.preventDefault()} className="flex gap-2 items-end">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={!!pendingMedia || sendingPhoto || sendingVideo}
                className="p-2.5 flex-shrink-0 rounded-[10px] transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-40"
                title="写真を送る (15pt)"
              >
                <ImagePlus size={17} />
              </button>
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={!!pendingMedia || sendingPhoto || sendingVideo}
                className="p-2.5 flex-shrink-0 rounded-[10px] transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-40"
                title="動画を送る (30pt)"
              >
                <VideoIcon size={17} />
              </button>
              <div className="flex-1 flex flex-col min-w-0">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleTextareaChange}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPendingOrText() } }}
                  placeholder={pendingMedia ? '（メディアを送信します）' : 'メッセージを送る…'}
                  disabled={!!pendingMedia}
                  rows={1}
                  maxLength={300}
                  name="message"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  className="flex-1 input-warm px-4 py-2.5 resize-none disabled:opacity-60"
                  style={{ minHeight: '42px', maxHeight: '120px', lineHeight: '1.5', fontSize: '16px' }}
                />
                {input.length > 0 && (
                  <p className="text-right text-[11px] mt-0.5 mr-1" style={{ color: input.length >= 300 ? '#e8438f' : 'var(--color-text-muted)' }}>
                    {input.length}/300
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={sendPendingOrText}
                disabled={(!input.trim() && !pendingMedia) || input.length > 300 || sending || sendingPhoto || sendingVideo}
                className="btn-primary p-2.5 flex-shrink-0 disabled:opacity-40"
                style={{ borderRadius: '10px' }}
              >
                <Send size={17} />
              </button>
            </form>
          </div>
        ) : (
          <div className="rounded-2xl px-4 py-3 text-center"
            style={{ background: 'linear-gradient(135deg, rgba(249,168,184,0.15), rgba(232,121,160,0.08))', border: '1px solid var(--color-border-warm)' }}>
            <p className="text-sm font-bold mb-0.5">🎀 アイカノでチャットを楽しもう</p>
            <p className="text-xs text-[var(--color-text-muted)]">新規登録で3,000円分のポイントをプレゼント中。登録は無料・30秒で完了！</p>
          </div>
        )}
      </div>

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

function MessageBubble({ message, characterName, characterAvatar, onImageClick, unlockedVideos, onUnlockVideo }: {
  message: Message; characterName: string; characterAvatar: string
  onImageClick?: (url: string) => void
  unlockedVideos?: Set<string>
  onUnlockVideo?: (messageId: string) => Promise<void>
}) {
  const [unlocking, setUnlocking] = useState(false)
  const isUser = message.sender_role === 'user'
  const isItem = !!message.metadata?.item_id
  const hasBroadcastImage = !isItem && !!message.metadata?.image_url
  const hasVideo = !isItem && !!message.metadata?.video_url
  const isVideoUnlocked = !isUser ? (unlockedVideos?.has(message.id) ?? false) : true

  const handleUnlockVideo = async () => {
    if (!onUnlockVideo) return
    setUnlocking(true)
    await onUnlockVideo(message.id)
    setUnlocking(false)
  }

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
        ) : hasVideo ? (
          <div className={`rounded-2xl overflow-hidden ${isUser ? 'bubble-user' : 'bubble-operator'}`} style={{ maxWidth: '240px' }}>
            {isVideoUnlocked ? (
              <video
                src={message.metadata!.video_url!}
                controls
                playsInline
                className="w-full block rounded-2xl"
                style={{ maxHeight: '320px' }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 px-5 py-6"
                style={{ background: 'var(--color-surface-2)', minWidth: '180px' }}>
                <div className="text-3xl">🎬</div>
                <p className="text-xs font-semibold text-center" style={{ color: 'var(--color-text)' }}>動画メッセージ</p>
                <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>50ptで視聴できます</p>
                <button
                  onClick={handleUnlockVideo}
                  disabled={unlocking}
                  className="mt-1 px-4 py-1.5 rounded-full text-xs font-bold text-white disabled:opacity-50"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {unlocking ? '処理中…' : '50ptで視聴する'}
                </button>
              </div>
            )}
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
      </div>
    </div>
  )
}
