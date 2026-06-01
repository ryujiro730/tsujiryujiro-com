'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Send, ChevronLeft, Loader2, FileText, Save, Tag, Pencil, Trash2, Check, X, ImagePlus, VideoIcon, Library, Play, User, StickyNote, Search, ExternalLink } from 'lucide-react'
import { compressImage } from '@/lib/compress-image'
import { formatDistanceToNow } from 'date-fns'
import { format, toZonedTime } from 'date-fns-tz'
import { ja } from 'date-fns/locale'
import type { Message, Character, Profile } from '@/types'

type Label = { id: string; name: string; color: string }
type Template = { id: string; title: string; content: string; sort_order: number }

export default function AdminConversationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [messages, setMessages] = useState<Message[]>([])
  const [character, setCharacter] = useState<Character | null>(null)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [staffNote, setStaffNote] = useState('')
  const [noteLoading, setNoteLoading] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)
  const [labels, setLabels] = useState<Label[]>([])
  const [assignedLabelIds, setAssignedLabelIds] = useState<Set<string>>(new Set())
  const [adminNote, setAdminNote] = useState('')
  const [adminNoteLoading, setAdminNoteLoading] = useState(false)
  const [adminNoteSaved, setAdminNoteSaved] = useState(false)
  const [queueInfo, setQueueInfo] = useState<{ pos: number; total: number } | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [pendingMedia, setPendingMedia] = useState<{ file: File; mediaType: 'image' | 'video'; previewUrl: string } | null>(null)

  // モバイルサイドバー
  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)

  // オペグラ
  const [opegraOpen, setOpegraOpen] = useState(false)
  const [opegraPhotos, setOpegraPhotos] = useState<any[]>([])
  const [opegraConvCharId, setOpegraConvCharId] = useState<string | null>(null)
  const [opegraLoading, setOpegraLoading] = useState(false)
  const [opegraFilter, setOpegraFilter] = useState<'all' | 'char' | 'generic' | 'food' | 'scenery' | 'hobby' | 'other'>('all')
  const [opegraSearch, setOpegraSearch] = useState('')
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
  const [sendingOpegra, setSendingOpegra] = useState(false)

  // ユーザー詳細モーダル
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [userModalTx, setUserModalTx] = useState<any[]>([])
  const [userModalTxLoading, setUserModalTxLoading] = useState(false)
  // ステージング中のオペグラ写真
  const [pendingOpegra, setPendingOpegra] = useState<{ photoId: string; imageUrl: string; title: string; mediaType: 'image' | 'video' } | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sendBtnRef = useRef<HTMLButtonElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const supabaseRef = useRef(createClient())
  const channelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null)
  const stopTypingTimerRef = useRef<NodeJS.Timeout | null>(null)

  const supabase = supabaseRef.current

  const openUserModal = async () => {
    if (!userProfile) return
    setUserModalOpen(true)
    setUserModalTxLoading(true)
    const { data } = await supabase
      .from('point_transactions')
      .select('id, amount, type, description, price_yen, created_at')
      .eq('user_id', userProfile.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setUserModalTx(data ?? [])
    setUserModalTxLoading(false)
  }

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    loadData()
    return () => {
      broadcastTyping(false)
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current)
    }
  }, [id])

  useEffect(() => { scrollToBottom() }, [messages])

  const prefetchNextConv = (queue: string[], pos: number) => {
    const nextId = queue[pos + 1]
    if (!nextId) return
    router.prefetch(`/admin/conversations/${nextId}`)
    // データも先読みしてsessionStorageにキャッシュ
    const cacheKey = `conv_cache_${nextId}`
    if (!sessionStorage.getItem(cacheKey)) {
      fetch(`/api/admin/conversation-detail/${nextId}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) sessionStorage.setItem(cacheKey, JSON.stringify(data)) })
        .catch(() => {})
    }
  }

  const applyConvData = (json: any) => {
    const DEFAULT_STAFF_NOTE = `★★★★★★$nickname$★★★★★★\n\n\n\n\n★★★★★★★★キャラ★★★★★★★`
    const conv = json.conversation
    setCharacter(conv.characters as Character)
    setUserProfile(conv.profiles)
    setMessages(json.messages)
    setStaffNote(conv.staff_note ?? DEFAULT_STAFF_NOTE)
    setTemplates(json.templates)
    setLabels(json.labels)
    setAssignedLabelIds(new Set(json.assignedLabelIds))
    setAdminNote(json.adminNote)
  }

  const loadData = async () => {
    // キャッシュがあれば即座に表示
    const cacheKey = `conv_cache_${id}`
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      sessionStorage.removeItem(cacheKey)
      try {
        const json = JSON.parse(cached)
        if (json.conversation) {
          applyConvData(json)
          setLoading(false)
          // リアルタイム購読だけセット
          const channel = supabase.channel(`chat:${id}`)
          channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (payload) => {
            const m = payload.new as Message
            setMessages(prev => prev.find(p => p.id === m.id) ? prev : [...prev, m])
          })
          channelRef.current = channel
          channel.subscribe()
          try {
            const raw = sessionStorage.getItem('convQueue')
            const pos = parseInt(sessionStorage.getItem('convQueuePos') ?? '-1')
            if (raw && pos >= 0) {
              const queue: string[] = JSON.parse(raw)
              setQueueInfo({ pos, total: queue.length })
              prefetchNextConv(queue, pos)
            } else { setQueueInfo(null) }
          } catch { /* ignore */ }
          setTimeout(() => textareaRef.current?.focus(), 80)
          return
        }
      } catch { /* キャッシュ壊れてたら通常フェッチへ */ }
    }

    // 通常フェッチ
    const res = await fetch(`/api/admin/conversation-detail/${id}`)
    if (!res.ok) { console.error('conv fetch error:', res.status); setLoading(false); return }
    const json = await res.json()
    if (!json.conversation) { router.push('/admin/conversations'); return }

    applyConvData(json)

    const channel = supabase.channel(`chat:${id}`)
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (payload) => {
      const m = payload.new as Message
      setMessages(prev => prev.find(p => p.id === m.id) ? prev : [...prev, m])
    })
    channelRef.current = channel
    channel.subscribe()
    setLoading(false)

    try {
      const raw = sessionStorage.getItem('convQueue')
      const pos = parseInt(sessionStorage.getItem('convQueuePos') ?? '-1')
      if (raw && pos >= 0) {
        const queue: string[] = JSON.parse(raw)
        setQueueInfo({ pos, total: queue.length })
        prefetchNextConv(queue, pos)
      } else { setQueueInfo(null) }
    } catch { /* ignore */ }

    setTimeout(() => textareaRef.current?.focus(), 80)
  }

  const broadcastTyping = useCallback((isTyping: boolean) => {
    channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { isTyping } })
  }, [])

  const handleFocus = () => { broadcastTyping(true) }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
    broadcastTyping(true)
    if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current)
    stopTypingTimerRef.current = setTimeout(() => broadcastTyping(false), 3000)
  }

  const handleBlur = () => {
    if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current)
    broadcastTyping(false)
  }

  // Tab押下で送信ボタンにフォーカス移動
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      sendBtnRef.current?.focus()
    }
    // Shift+Enterは改行（デフォルト動作を維持）
  }

  const applyTemplate = (template: Template) => {
    setInput(template.content)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px'
      textareaRef.current.focus()
    }
  }

  const advanceToNext = () => {
    try {
      const raw = sessionStorage.getItem('convQueue')
      const pos = parseInt(sessionStorage.getItem('convQueuePos') ?? '-1')
      if (raw && pos >= 0) {
        const queue: string[] = JSON.parse(raw)
        const nextPos = pos + 1
        if (nextPos < queue.length) {
          sessionStorage.setItem('convQueuePos', String(nextPos))
          router.push(`/admin/conversations/${queue[nextPos]}`)
          return
        }
      }
    } catch { /* ignore */ }
    const returnTo = sessionStorage.getItem('convQueueReturn') ?? '/admin/conversations'
    sessionStorage.removeItem('convQueue')
    sessionStorage.removeItem('convQueuePos')
    sessionStorage.removeItem('convQueueReturn')
    router.push(returnTo)
  }

  const toggleLabel = async (labelId: string) => {
    if (!userProfile) return
    const isAssigned = assignedLabelIds.has(labelId)
    if (isAssigned) {
      await supabase.from('user_label_assignments').delete().eq('user_id', userProfile.id).eq('label_id', labelId)
      setAssignedLabelIds(prev => { const s = new Set(prev); s.delete(labelId); return s })
    } else {
      await supabase.from('user_label_assignments').insert({ user_id: userProfile.id, label_id: labelId })
      setAssignedLabelIds(prev => { const s = new Set(prev); s.add(labelId); return s })
    }
  }

  const saveAdminNote = async () => {
    if (!userProfile) return
    setAdminNoteLoading(true)
    const res = await fetch('/api/admin/profile-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userProfile.id, note: adminNote }),
    })
    setAdminNoteLoading(false)
    if (!res.ok) { alert('保存に失敗しました'); return }
    setAdminNoteSaved(true)
    setTimeout(() => setAdminNoteSaved(false), 2000)
  }

  const saveNote = async () => {
    setNoteLoading(true)
    await supabase.from('conversations').update({ staff_note: staffNote }).eq('id', id)
    setNoteLoading(false)
    setNoteSaved(true)
    setTimeout(() => setNoteSaved(false), 2000)
  }

  const deleteMessage = async (msgId: string) => {
    if (!confirm('このメッセージを削除しますか？ユーザーからも見えなくなります。')) return
    const { error } = await supabase.from('messages').update({ is_deleted: true }).eq('id', msgId)
    if (error) { alert('削除に失敗しました'); return }
    setMessages(prev => prev.filter(m => m.id !== msgId))
  }

  const startEdit = (msg: Message) => {
    setEditingMsgId(msg.id)
    setEditingContent(msg.content)
  }

  const cancelEdit = () => {
    setEditingMsgId(null)
    setEditingContent('')
  }

  const saveEdit = async (msgId: string) => {
    if (!editingContent.trim()) return
    const { error } = await supabase.from('messages')
      .update({ content: editingContent.trim(), edited_at: new Date().toISOString() })
      .eq('id', msgId)
    if (error) { alert('編集に失敗しました'); return }
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: editingContent.trim(), edited_at: new Date().toISOString() } : m))
    setEditingMsgId(null)
    setEditingContent('')
  }

  const sendReply = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    const content = input.trim()
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current)
    broadcastTyping(false)

    // キューモード：送信はバックグラウンドで投げて即座に次へ
    if (sessionStorage.getItem('convQueue')) {
      fetch('/api/admin/staff-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: id, content }),
      }).catch(e => console.error('[admin] staff-reply error:', e))
      advanceToNext()
      return
    }

    // 通常モード：レスポンスを待つ
    const res = await fetch('/api/admin/staff-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: id, content }),
    })

    if (!res.ok) { console.error('[admin] staff-reply error:', await res.text()); setSending(false); return }

    const { message: msg } = await res.json()
    if (msg) {
      setMessages(prev => prev.find(p => p.id === msg.id) ? prev : [...prev, msg])
      channelRef.current?.send({ type: 'broadcast', event: 'new_message', payload: { message: msg } })
    }

    setSending(false)
    router.refresh()
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const previewUrl = URL.createObjectURL(file)
    setPendingMedia({ file, mediaType: 'image', previewUrl })
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const previewUrl = URL.createObjectURL(file)
    setPendingMedia({ file, mediaType: 'video', previewUrl })
  }

  const openOpegra = async () => {
    setOpegraOpen(true)
    setOpegraLoading(true)
    setSelectedPhotoId(null)
    setOpegraFilter('all')
    setOpegraSearch('')
    const res = await fetch(`/api/opegra?conversationId=${id}`)
    const { photos, characterId } = await res.json()
    setOpegraPhotos(photos ?? [])
    setOpegraConvCharId(characterId ?? null)
    setOpegraLoading(false)
  }

  // ダイアログで選択 → ステージングに入れて閉じる
  const stageOpegraPhoto = () => {
    if (!selectedPhotoId) return
    const photo = opegraPhotos.find(p => p.id === selectedPhotoId)
    if (!photo) return
    setPendingOpegra({ photoId: photo.id, imageUrl: photo.image_url, title: photo.title ?? '', mediaType: photo.media_type ?? 'image' })
    setPendingMedia(null) // 通常のメディアステージをクリア
    setSelectedPhotoId(null)
    setOpegraOpen(false)
  }

  // 送信ボタン押下 → 実際に送信
  const sendOpegraPhoto = async () => {
    if (!pendingOpegra || sendingOpegra) return
    setSendingOpegra(true)
    const { photoId } = pendingOpegra
    setPendingOpegra(null)

    const res = await fetch('/api/opegra/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoId, conversationId: id }),
    })
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: '送信に失敗しました' }))
      alert(error ?? '送信に失敗しました')
      setSendingOpegra(false)
      return
    }
    const { message: msg } = await res.json()
    if (msg) {
      setMessages(prev => prev.find(p => p.id === msg.id) ? prev : [...prev, msg])
      channelRef.current?.send({ type: 'broadcast', event: 'new_message', payload: { message: msg } })
    }
    setOpegraPhotos(prev => prev.map(p => p.id === photoId ? { ...p, already_sent: true } : p))
    setSendingOpegra(false)
    if (sessionStorage.getItem('convQueue')) advanceToNext()
    else router.refresh()
  }

  const cancelPendingMedia = () => {
    if (pendingMedia) URL.revokeObjectURL(pendingMedia.previewUrl)
    setPendingMedia(null)
  }

  const sendPendingMedia = async () => {
    if (!pendingMedia) return
    const { file, mediaType, previewUrl } = pendingMedia
    setPendingMedia(null)
    URL.revokeObjectURL(previewUrl)

    if (mediaType === 'image') {
      setUploadingImage(true)
      const { blob: compressed } = await compressImage(file)
      const path = `admin-chat/${id}/${Date.now()}.webp`
      const { error: uploadErr } = await supabase.storage.from('chat-images').upload(path, compressed, { upsert: true, contentType: 'image/webp' })
      if (uploadErr) { alert('画像のアップロードに失敗しました: ' + uploadErr.message); setUploadingImage(false); return }
      const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(path)
      setUploadingImage(false)
      const res = await fetch('/api/admin/staff-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: id, content: '', imageUrl: urlData.publicUrl }),
      })
      if (!res.ok) { alert('画像メッセージの送信に失敗しました'); return }
      const { message: msg } = await res.json()
      if (msg) {
        setMessages(prev => prev.find(p => p.id === msg.id) ? prev : [...prev, msg])
        channelRef.current?.send({ type: 'broadcast', event: 'new_message', payload: { message: msg } })
      }
    } else {
      setUploadingVideo(true)
      const ext = file.name.split('.').pop()
      const path = `admin-videos/${id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('chat-images').upload(path, file, { upsert: true, contentType: file.type })
      if (uploadErr) { alert('動画のアップロードに失敗しました: ' + uploadErr.message); setUploadingVideo(false); return }
      const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(path)
      setUploadingVideo(false)
      const res = await fetch('/api/admin/staff-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: id, content: '', videoUrl: urlData.publicUrl }),
      })
      if (!res.ok) { alert('動画メッセージの送信に失敗しました'); return }
      const { message: msg } = await res.json()
      if (msg) {
        setMessages(prev => prev.find(p => p.id === msg.id) ? prev : [...prev, msg])
        channelRef.current?.send({ type: 'broadcast', event: 'new_message', payload: { message: msg } })
      }
    }
    if (sessionStorage.getItem('convQueue')) advanceToNext()
    else router.refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" style={{ color: 'var(--color-primary)' }} size={22} />
      </div>
    )
  }

  return (
    <>
    <div className="flex h-[calc(100vh-48px)] -my-5 overflow-hidden">

      {/* モバイル：左ドロワー背景 */}
      {leftOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setLeftOpen(false)} />}
      {/* モバイル：右ドロワー背景 */}
      {rightOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setRightOpen(false)} />}

      {/* 左サイドバー：ユーザー情報 ＋ テンプレート */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-50 md:z-auto
        w-72 flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col
        transition-transform duration-200 md:translate-x-0
        ${leftOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>

        {/* ユーザー情報 */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="text-sm font-bold">ユーザー情報</h2>
          <button className="md:hidden text-[var(--color-text-muted)]" onClick={() => setLeftOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-4 text-sm overflow-y-auto" style={{ maxHeight: '40%' }}>
          {userProfile && (
            <>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">ID</p>
                <button onClick={openUserModal} className="font-mono text-xs text-[var(--color-primary-light)] hover:underline">
                  {userProfile.user_code ?? userProfile.id}
                </button>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">ポイント</p>
                <p>{userProfile.points?.toLocaleString()} T</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">課金額</p>
                <p>¥{(userProfile as any).total_spent?.toLocaleString() ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">登録日時</p>
                <p>{userProfile.created_at ? format(toZonedTime(new Date(userProfile.created_at), 'Asia/Tokyo'), 'yyyy/MM/dd HH:mm') : '-'}</p>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">年齢</p>
                  <p>{userProfile.age ?? '不明'}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">性別</p>
                  <p>{userProfile.gender ?? '未設定'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">流入元</p>
                <p>{(userProfile as any).referral_source ?? '—'}</p>
              </div>
              {labels.length > 0 && (
                <div>
                  <p className="text-xs text-[var(--color-text-muted)] mb-2 flex items-center gap-1">
                    <Tag size={11} /> ラベル
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {labels.map(label => {
                      const assigned = assignedLabelIds.has(label.id)
                      return (
                        <button
                          key={label.id}
                          onClick={() => toggleLabel(label.id)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all border"
                          style={{
                            backgroundColor: assigned ? label.color + '33' : 'var(--color-surface-2)',
                            borderColor: assigned ? label.color : 'var(--color-border)',
                            color: assigned ? label.color : 'var(--color-text-muted)',
                          }}
                        >
                          {label.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-[var(--color-text-muted)] mb-2">管理者メモ</p>
                <textarea
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  rows={3}
                  placeholder="このユーザーに関するメモ…"
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border-warm)] rounded-lg p-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                />
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    onClick={saveAdminNote}
                    disabled={adminNoteLoading}
                    className="btn-primary px-3 py-1 text-xs flex items-center gap-1.5 disabled:opacity-40"
                  >
                    {adminNoteLoading ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                    保存
                  </button>
                  {adminNoteSaved && <span className="text-green-400 text-xs">保存済</span>}
                </div>
              </div>
            </>
          )}
        </div>

        {/* テンプレート */}
        <div className="border-t border-[var(--color-border)] flex flex-col flex-1 min-h-0">
          <div className="px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">返信テンプレート</h2>
            {character && (
              <Link
                href={`/admin/characters`}
                className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
              >
                編集 →
              </Link>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
            {templates.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] text-center py-4">
                テンプレートがありません
              </p>
            ) : (
              templates.map(tmpl => (
                <button
                  key={tmpl.id}
                  onClick={() => applyTemplate(tmpl)}
                  className="w-full text-left rounded-xl px-3 py-2.5 transition-colors group"
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                >
                  <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--color-primary)' }}>
                    {tmpl.title}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 leading-relaxed">
                    {tmpl.content}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* チャットエリア */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-[var(--color-border)]">

        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
          style={{ background: 'rgba(23,18,13,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--color-border)' }}
        >
          <Link href="/admin/conversations" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors flex-shrink-0">
            <ChevronLeft size={20} />
          </Link>
          {/* モバイル：サイドバートグル */}
          <button className="md:hidden flex-shrink-0 p-1.5 rounded-lg text-[var(--color-text-muted)]" onClick={() => setLeftOpen(true)}>
            <User size={18} />
          </button>
          {queueInfo && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-[var(--color-text-muted)] font-mono">{queueInfo.pos + 1} / {queueInfo.total}</span>
              <button
                onClick={advanceToNext}
                className="text-xs px-2 py-1 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                スキップ →
              </button>
            </div>
          )}
          {character && (
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <div className="w-8 h-8 rounded-full overflow-hidden border border-[var(--color-border-warm)] flex-shrink-0">
                <img src={character.avatar_url} alt={character.name} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{character.name} として返信</p>
                {userProfile && (
                  <p className="text-[var(--color-text-muted)] text-xs truncate">
                    相手: {userProfile.display_name || userProfile.email || '匿名'} · {userProfile.points}T
                  </p>
                )}
              </div>
            </div>
          )}
          {/* モバイル：メモトグル */}
          <button className="md:hidden flex-shrink-0 p-1.5 rounded-lg text-[var(--color-text-muted)]" onClick={() => setRightOpen(true)}>
            <StickyNote size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.map((msg, i) => {
            const isOp = msg.sender_role === 'character'
            const showDate = i === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[i - 1].created_at).toDateString()
            const isEditing = editingMsgId === msg.id
            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="text-center my-3">
                    <span className="text-[var(--color-text-muted)] text-xs px-3 py-1 rounded-full" style={{ background: 'var(--color-surface-2)' }}>
                      {format(toZonedTime(new Date(msg.created_at), 'Asia/Tokyo'), 'M月d日(E)', { locale: ja })}
                    </span>
                  </div>
                )}
                <div className={`flex items-end gap-2 group ${isOp ? 'flex-row-reverse' : ''}`}>
                  <div className={`max-w-[72%] flex flex-col gap-1 ${isOp ? 'items-end' : 'items-start'}`}>
                    {isEditing ? (
                      <div className="flex flex-col gap-1.5 w-72">
                        <textarea
                          value={editingContent}
                          onChange={e => setEditingContent(e.target.value)}
                          rows={3}
                          className="w-full text-sm px-3 py-2 rounded-xl border border-[var(--color-primary)] bg-[var(--color-surface-2)] resize-none focus:outline-none"
                          autoFocus
                        />
                        <div className="flex gap-1.5">
                          <button onClick={() => saveEdit(msg.id)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-white" style={{ background: 'var(--color-primary)' }}>
                            <Check size={11} />保存
                          </button>
                          <button onClick={cancelEdit} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                            <X size={11} />キャンセル
                          </button>
                        </div>
                      </div>
                    ) : msg.metadata?.video_url ? (
                      <div className={`overflow-hidden rounded-2xl ${isOp ? 'rounded-br-sm' : 'rounded-bl-sm'}`} style={{ maxWidth: 240 }}>
                        <video src={msg.metadata.video_url} controls playsInline style={{ display: 'block', width: '100%', maxHeight: 320 }} />
                        {isOp && <p className="text-[10px] px-2 pb-1" style={{ color: 'var(--color-text-muted)' }}>🔒 ユーザーは50ptで視聴</p>}
                      </div>
                    ) : msg.metadata?.image_url ? (
                      <div className={`overflow-hidden rounded-2xl ${isOp ? 'rounded-br-sm' : 'rounded-bl-sm'}`} style={{ maxWidth: 240 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={msg.metadata.image_url} alt="送信画像" style={{ display: 'block', width: '100%', maxWidth: 240 }} />
                      </div>
                    ) : (
                      <div className={`px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${isOp ? 'bubble-user' : 'bubble-operator'}`}>
                        {msg.content}
                        {msg.edited_at && <span className="ml-1.5 text-[10px] opacity-60">(編集済み)</span>}
                      </div>
                    )}
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[var(--color-text-muted)] text-[11px]">
                        {isOp ? character?.name : userProfile?.display_name || userProfile?.email || '匿名'}
                        {' · '}
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ja })}
                      </span>
                      {isOp && !isEditing && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(msg)} title="編集" className="p-1 rounded hover:bg-[var(--color-surface-2)] transition-colors">
                            <Pencil size={11} className="text-[var(--color-text-muted)]" />
                          </button>
                          <button onClick={() => deleteMessage(msg.id)} title="削除" className="p-1 rounded hover:bg-red-500/10 transition-colors">
                            <Trash2 size={11} className="text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 px-5 py-4" style={{ borderTop: '1px solid var(--color-border)', background: 'rgba(23,18,13,0.95)' }}>
          {character && (
            <p className="text-[var(--color-text-muted)] text-xs mb-2">
              {character.name} として返信
              <span className="hidden md:inline"> · <kbd className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>Tab</kbd> で送信ボタンへ移動</span>
            </p>
          )}
          {/* メディアプレビュー（通常アップロード） */}
          {pendingMedia && (
            <div className="flex items-center gap-3 mb-2 p-2 rounded-xl" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <div className="relative rounded-lg overflow-hidden flex-shrink-0" style={{ width: 56, height: 56 }}>
                {pendingMedia.mediaType === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pendingMedia.previewUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--color-surface)' }}>
                    <VideoIcon size={22} className="text-[var(--color-text-muted)]" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate text-[var(--color-text)]">{pendingMedia.file.name}</p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                  {pendingMedia.mediaType === 'video' ? '🔒 ユーザーは50ptで視聴' : '画像'}　·　送信ボタンで確定
                </p>
              </div>
              <button onClick={cancelPendingMedia} className="p-1.5 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex-shrink-0" style={{ background: 'var(--color-surface)' }}>
                <X size={14} />
              </button>
            </div>
          )}
          {/* オペグラ写真・動画プレビュー */}
          {pendingOpegra && (
            <div className="flex items-center gap-3 mb-2 p-2 rounded-xl" style={{ background: 'var(--color-primary-glow)', border: '1px solid var(--color-border-warm)' }}>
              <div className="relative rounded-lg overflow-hidden flex-shrink-0" style={{ width: 56, height: 56 }}>
                {pendingOpegra.mediaType === 'video' ? (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--color-surface)' }}>
                    <Play size={20} style={{ color: 'var(--color-primary)' }} />
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pendingOpegra.imageUrl} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: 'var(--color-primary)' }}>
                  オペグラ · {pendingOpegra.mediaType === 'video' ? '動画' : '写真'}{pendingOpegra.title ? ` · ${pendingOpegra.title}` : ''}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">送信ボタンで確定</p>
              </div>
              <button onClick={() => setPendingOpegra(null)} className="p-1.5 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex-shrink-0" style={{ background: 'var(--color-surface)' }}>
                <X size={14} />
              </button>
            </div>
          )}
          <div className="flex flex-col md:flex-row gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              rows={3}
              disabled={!!pendingMedia || !!pendingOpegra}
              placeholder={pendingMedia || pendingOpegra ? '（メディアを送信します）' : `${character?.name}として返信…`}
              className="flex-1 input-warm px-4 py-2.5 text-sm resize-none disabled:opacity-50"
            />
            <div className="flex md:flex-col gap-2">
              {/* 画像送信 */}
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={!!pendingMedia || !!pendingOpegra || uploadingImage || sending}
                title="画像を送信"
                className="px-3 flex items-center justify-center gap-1.5 text-sm rounded-lg disabled:opacity-40 transition-colors"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', height: '40px' }}
              >
                {uploadingImage ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
              </button>
              {/* 動画送信 */}
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />
              <button
                onClick={() => videoInputRef.current?.click()}
                disabled={!!pendingMedia || !!pendingOpegra || uploadingVideo || sending}
                title="動画を送信（ユーザーは50ptで視聴）"
                className="px-3 flex items-center justify-center gap-1.5 text-sm rounded-lg disabled:opacity-40 transition-colors"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', height: '40px' }}
              >
                {uploadingVideo ? <Loader2 size={15} className="animate-spin" /> : <VideoIcon size={15} />}
              </button>
              {/* オペグラ */}
              <button
                onClick={openOpegra}
                disabled={!!pendingMedia || !!pendingOpegra || sending}
                title="オペグラ（写真ライブラリ）"
                className="px-3 flex items-center justify-center gap-1.5 text-sm rounded-lg disabled:opacity-40 transition-colors"
                style={{ background: 'var(--color-primary-glow)', border: '1px solid var(--color-border-warm)', color: 'var(--color-primary)', height: '40px' }}
              >
                <Library size={15} />
              </button>
              {/* 送信ボタン */}
              <button
                ref={sendBtnRef}
                onClick={pendingOpegra ? sendOpegraPhoto : pendingMedia ? sendPendingMedia : sendReply}
                disabled={(!input.trim() && !pendingMedia && !pendingOpegra) || sending || sendingOpegra || uploadingImage || uploadingVideo}
                className="btn-primary px-4 flex items-center justify-center gap-1.5 text-sm disabled:opacity-40 flex-1"
              >
                {sending || sendingOpegra || uploadingImage || uploadingVideo ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {queueInfo ? '送信して次へ' : '送信'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 右サイドバー：やり取りメモ */}
      <aside className={`
        fixed md:relative inset-y-0 right-0 z-50 md:z-auto
        w-80 flex-shrink-0 border-l border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col
        transition-transform duration-200 md:translate-x-0
        ${rightOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <FileText size={16} /> やり取りメモ
          </h2>
          <button className="md:hidden text-[var(--color-text-muted)]" onClick={() => setRightOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="p-4 flex-1 flex flex-col gap-3">
          <textarea
            value={staffNote}
            onChange={e => setStaffNote(e.target.value)}
            className="flex-1 w-full bg-[var(--color-surface-2)] border border-[var(--color-border-warm)] rounded-lg p-3 text-sm resize-none"
            placeholder="ユーザーの特徴や流れをメモ..."
          />
          <button
            onClick={saveNote}
            disabled={noteLoading}
            className="w-full btn-primary py-2 text-xs flex items-center justify-center gap-2"
          >
            {noteLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            保存
          </button>
          {noteSaved && <span className="text-green-400 text-xs text-center">保存済</span>}
        </div>
      </aside>
    </div>

    {/* ===== ユーザー詳細モーダル ===== */}
    {userModalOpen && userProfile && (
      <div
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget) setUserModalOpen(false) }}
      >
        <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ width: '480px', maxWidth: '95vw', maxHeight: '85vh' }}>
          {/* ヘッダー */}
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <h2 className="font-bold text-base">{userProfile.display_name ?? '匿名ユーザー'}</h2>
              <p className="text-xs text-[var(--color-text-muted)] font-mono">{userProfile.user_code} · {userProfile.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/admin/users/${userProfile.id}`} target="_blank" className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors" title="詳細ページを開く">
                <ExternalLink size={15} />
              </Link>
              <button onClick={() => setUserModalOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                <X size={20} />
              </button>
            </div>
          </div>
          {/* コンテンツ */}
          <div className="overflow-y-auto flex-1 p-5 space-y-5">
            {/* 基本情報 */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-[var(--color-text-muted)]">年齢</p><p>{userProfile.age != null ? `${userProfile.age}歳` : '—'}</p></div>
              <div><p className="text-xs text-[var(--color-text-muted)]">性別</p><p>{({'male': '男性', 'female': '女性', 'other': 'その他'} as Record<string,string>)[userProfile.gender ?? ''] ?? '—'}</p></div>
              <div><p className="text-xs text-[var(--color-text-muted)]">ポイント残高</p><p className="font-semibold">{userProfile.points.toLocaleString()} T</p></div>
              <div><p className="text-xs text-[var(--color-text-muted)]">登録日</p><p>{format(toZonedTime(new Date(userProfile.created_at), 'Asia/Tokyo'), 'yyyy/MM/dd HH:mm')}</p></div>
              <div><p className="text-xs text-[var(--color-text-muted)]">最終ログイン</p><p>{userProfile.last_login_at ? formatDistanceToNow(new Date(userProfile.last_login_at), { addSuffix: true, locale: ja }) : '—'}</p></div>
              <div><p className="text-xs text-[var(--color-text-muted)]">流入元</p><p>{(userProfile as any).referral_source ?? '—'}</p></div>
            </div>
            {/* ラベル */}
            {labels.length > 0 && (
              <div>
                <p className="text-xs text-[var(--color-text-muted)] mb-2 flex items-center gap-1"><Tag size={11} /> ラベル</p>
                <div className="flex flex-wrap gap-1.5">
                  {labels.map(label => {
                    const assigned = assignedLabelIds.has(label.id)
                    return (
                      <button
                        key={label.id}
                        onClick={() => toggleLabel(label.id)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all border"
                        style={{
                          backgroundColor: assigned ? label.color + '33' : 'var(--color-surface-2)',
                          borderColor: assigned ? label.color : 'var(--color-border)',
                          color: assigned ? label.color : 'var(--color-text-muted)',
                        }}
                      >
                        {label.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {/* 管理者メモ */}
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-2">管理者メモ</p>
              <textarea
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                rows={3}
                placeholder="このユーザーに関するメモ…"
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border-warm)] rounded-lg p-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  onClick={saveAdminNote}
                  disabled={adminNoteLoading}
                  className="btn-primary px-3 py-1 text-xs flex items-center gap-1.5 disabled:opacity-40"
                >
                  {adminNoteLoading ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                  保存
                </button>
                {adminNoteSaved && <span className="text-green-400 text-xs">保存済</span>}
              </div>
            </div>
            {/* ポイント履歴 */}
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-2">ポイント履歴（直近20件）</p>
              {userModalTxLoading ? (
                <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-primary)' }} /></div>
              ) : userModalTx.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] text-center py-3">履歴なし</p>
              ) : (
                <div className="space-y-1">
                  {userModalTx.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs" style={{ background: 'var(--color-surface-2)' }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[var(--color-text-muted)] flex-shrink-0">{format(toZonedTime(new Date(tx.created_at), 'Asia/Tokyo'), 'MM/dd HH:mm')}</span>
                        <span className="truncate">{tx.description}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {tx.price_yen != null && <span className="text-green-400">¥{tx.price_yen.toLocaleString()}</span>}
                        <span className={tx.type === 'purchase' ? 'text-green-400 font-medium' : 'text-[var(--color-text-muted)]'}>
                          {tx.type === 'purchase' ? '+' : '-'}{Math.abs(tx.amount)}T
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ===== オペグラ ダイアログ ===== */}
    {opegraOpen && (
      <div
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget) setOpegraOpen(false) }}
      >
        <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ width: '720px', maxWidth: '95vw', height: '80vh' }}>

          {/* ヘッダー */}
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-2">
              <Library size={18} style={{ color: 'var(--color-primary)' }} />
              <h2 className="font-bold text-base">オペグラ</h2>
            </div>
            <button onClick={() => setOpegraOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              <X size={20} />
            </button>
          </div>

          {/* フィルタータブ */}
          <div className="px-5 py-3 space-y-2" style={{ borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
            <div className="flex flex-wrap gap-1.5">
              {([
                { key: 'all', label: 'すべて' },
                { key: 'char', label: 'このキャラ' },
                { key: 'generic', label: '汎用' },
                { key: 'food', label: '食べ物' },
                { key: 'scenery', label: '風景' },
                { key: 'hobby', label: '趣味' },
                { key: 'other', label: 'その他' },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setOpegraFilter(tab.key)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: opegraFilter === tab.key ? 'var(--color-primary)' : 'var(--color-surface-2)',
                    color: opegraFilter === tab.key ? '#fff' : 'var(--color-text-muted)',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {/* 検索 */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={opegraSearch}
                onChange={e => setOpegraSearch(e.target.value)}
                placeholder="ファイル名で検索…"
                className="w-full input-warm pl-8 pr-3 py-1.5 text-xs"
              />
            </div>
          </div>

          {/* 写真グリッド */}
          <div className="flex-1 overflow-y-auto p-4">
            {opegraLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="animate-spin" style={{ color: 'var(--color-primary)' }} size={24} />
              </div>
            ) : (() => {
              const filtered = opegraPhotos.filter(p => {
                if (opegraFilter === 'char') return p.character_id === opegraConvCharId
                if (opegraFilter === 'generic') return p.character_id === null && !p.category
                if (opegraFilter === 'food') return p.category === 'food'
                if (opegraFilter === 'scenery') return p.category === 'scenery'
                if (opegraFilter === 'hobby') return p.category === 'hobby'
                if (opegraFilter === 'other') return p.category === 'other'
                return true
              }).filter(p => !opegraSearch || (p.title || '').toLowerCase().includes(opegraSearch.toLowerCase()))
              if (filtered.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)]">
                    <Library size={36} className="opacity-20 mb-2" />
                    <p className="text-sm">写真がありません</p>
                  </div>
                )
              }
              return (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {filtered.map(photo => {
                    const isSelected = selectedPhotoId === photo.id
                    const isSent = photo.already_sent
                    return (
                      <div
                        key={photo.id}
                        onClick={() => { if (!isSent) setSelectedPhotoId(isSelected ? null : photo.id) }}
                        className="relative rounded-xl overflow-hidden cursor-pointer transition-all"
                        style={{
                          border: isSelected ? '2.5px solid var(--color-primary)' : '2px solid transparent',
                          opacity: isSent ? 0.45 : 1,
                          cursor: isSent ? 'not-allowed' : 'pointer',
                          boxShadow: isSelected ? '0 0 0 3px var(--color-primary-glow)' : 'none',
                        }}
                      >
                        <div className="aspect-[3/4] bg-[var(--color-surface-2)] relative">
                          {photo.media_type === 'video' ? (
                            <>
                              <video
                                src={photo.image_url}
                                className="w-full h-full object-cover"
                                muted
                                preload="metadata"
                              />
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="bg-black/50 rounded-full w-8 h-8 flex items-center justify-center">
                                  <Play size={14} className="text-white ml-0.5" />
                                </div>
                              </div>
                            </>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={photo.image_url}
                              alt={photo.title || '写真'}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        {isSent && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <span className="bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">送信済</span>
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 bg-[var(--color-primary)] rounded-full w-5 h-5 flex items-center justify-center">
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                        {photo.title && (
                          <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 text-[10px] text-white font-medium truncate"
                            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
                            {photo.title}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {/* フッター：送信ボタン */}
          <div className="px-5 py-3 flex items-center gap-3" style={{ borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
            <span className="text-xs text-[var(--color-text-muted)] flex-1">
              {selectedPhotoId ? '選択中：1枚' : '写真を選択してください'}
            </span>
            <button
              onClick={() => setOpegraOpen(false)}
              className="btn-ghost px-4 py-2 text-sm"
            >
              キャンセル
            </button>
            <button
              onClick={stageOpegraPhoto}
              disabled={!selectedPhotoId}
              className="btn-cta px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ImagePlus size={15} />
              選択してセット
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
