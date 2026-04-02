'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Send, ChevronLeft, Loader2, FileText, Save, Tag } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Message, Character, Profile } from '@/types'

type Label = { id: string; name: string; color: string }

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
  const [showNote, setShowNote] = useState(false)
  const [labels, setLabels] = useState<Label[]>([])
  const [assignedLabelIds, setAssignedLabelIds] = useState<Set<string>>(new Set())
  const [adminNote, setAdminNote] = useState('')
  const [adminNoteLoading, setAdminNoteLoading] = useState(false)
  const [adminNoteSaved, setAdminNoteSaved] = useState(false)
  const [queueInfo, setQueueInfo] = useState<{ pos: number; total: number } | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const supabaseRef = useRef(createClient())
  const channelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null)
  const stopTypingTimerRef = useRef<NodeJS.Timeout | null>(null)

  const supabase = supabaseRef.current

  const openUserPopup = (userId: string) => {
  window.open(
    `/admin/users/${userId}`,
    'userDetail',
    'width=900,height=700,menubar=no,toolbar=no,location=no,status=no'
  )
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

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadData = async () => {
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select('id, staff_note, characters(*), profiles(*)')
      .eq('id', id)
      .single()

    if (convError) {
      console.error('conv fetch error:', convError.message)
      setLoading(false)
      return
    }

    if (!conv) {
      router.push('/admin/conversations')
      return
    }

    setCharacter((conv as any).characters)
    setUserProfile((conv as any).profiles)

    const userId = (conv as any).profiles?.id
    if (userId) {
      const [labelsRes, assignRes, noteRes] = await Promise.all([
        supabase.from('admin_labels').select('*').order('name'),
        supabase.from('user_label_assignments').select('label_id').eq('user_id', userId),
        fetch(`/api/admin/profile-note?userId=${userId}`).then(r => r.json()),
      ])
      setLabels(labelsRes.data ?? [])
      setAssignedLabelIds(new Set((assignRes.data ?? []).map((a: any) => a.label_id)))
      setAdminNote(noteRes.admin_note ?? '')
    }

    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    setMessages(msgs || [])
    setStaffNote((conv as any).staff_note ?? '')

    await supabase
      .from('conversations')
      .update({ is_unread_staff: false })
      .eq('id', id)

    const channel = supabase.channel(`chat:${id}`)

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${id}`,
      },
      (payload) => {
        const m = payload.new as Message
        setMessages((prev) =>
          prev.find((p) => p.id === m.id) ? prev : [...prev, m]
        )
      }
    )

    channelRef.current = channel
    channel.subscribe()

    setLoading(false)

    // キュー情報を読み込み
    try {
      const raw = sessionStorage.getItem('convQueue')
      const pos = parseInt(sessionStorage.getItem('convQueuePos') ?? '-1')
      if (raw && pos >= 0) {
        const queue: string[] = JSON.parse(raw)
        setQueueInfo({ pos, total: queue.length })
      } else {
        setQueueInfo(null)
      }
    } catch { /* ignore */ }

    // キーボードファーストのためテキストエリアにフォーカス
    setTimeout(() => textareaRef.current?.focus(), 80)
  }

  const broadcastTyping = useCallback((isTyping: boolean) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { isTyping },
    })
  }, [])

  const handleFocus = () => {
    broadcastTyping(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)

    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'

    broadcastTyping(true)

    if (stopTypingTimerRef.current)
      clearTimeout(stopTypingTimerRef.current)

    stopTypingTimerRef.current = setTimeout(() => {
      broadcastTyping(false)
    }, 3000)
  }

  const handleBlur = () => {
    if (stopTypingTimerRef.current)
      clearTimeout(stopTypingTimerRef.current)

    broadcastTyping(false)
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
    // キューが終わった or キューなし → アクセス元に戻る
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
    if (!res.ok) {
      const { error } = await res.json()
      alert('保存に失敗しました: ' + error)
      return
    }
    setAdminNoteSaved(true)
    setTimeout(() => setAdminNoteSaved(false), 2000)
  }

  const saveNote = async () => {
    setNoteLoading(true)

    await supabase
      .from('conversations')
      .update({ staff_note: staffNote })
      .eq('id', id)

    setNoteLoading(false)
    setNoteSaved(true)

    setTimeout(() => setNoteSaved(false), 2000)
  }

  const sendReply = async () => {
    if (!input.trim() || sending) return

    setSending(true)

    const content = input.trim()
    setInput('')

    if (textareaRef.current)
      textareaRef.current.style.height = 'auto'

    if (stopTypingTimerRef.current)
      clearTimeout(stopTypingTimerRef.current)

    broadcastTyping(false)

    const { data: msg } = await supabase
      .from('messages')
      .insert({
        conversation_id: id,
        sender_role: 'character',
        content,
        points_used: 0,
      })
      .select()
      .single()

    if (msg)
      setMessages((prev) =>
        prev.find((p) => p.id === msg.id) ? prev : [...prev, msg]
      )

    if (msg) {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'new_message',
        payload: { message: msg },
      })
    }

    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        is_unread_staff: false,
      })
      .eq('id', id)

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', id)
      .eq('sender_role', 'user')
      .eq('is_read', false)

    setSending(false)

    // キューがあれば次へ自動遷移、なければリフレッシュ
    if (sessionStorage.getItem('convQueue')) {
      advanceToNext()
    } else {
      router.refresh()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2
          className="animate-spin"
          style={{ color: 'var(--color-primary)' }}
          size={22}
        />
      </div>
    )
  }

return (
  <div className="flex h-[calc(100vh-48px)] -my-6 overflow-hidden">

          {/* 左サイドバー：ユーザー情報 */}
<aside className="w-72 flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col">
  <div className="p-4 border-b border-[var(--color-border)]">
    <h2 className="text-sm font-bold">ユーザー情報</h2>
  </div>

  <div className="p-4 space-y-4 text-sm overflow-y-auto flex-1">
    {userProfile && (
      <>
        {/* ID（クリックでポップアップ） */}
        <div>
          <p className="text-xs text-[var(--color-text-muted)]">ID</p>
          <button
            onClick={() => openUserPopup(userProfile.id)}
            className="font-mono text-xs text-[var(--color-primary-light)] hover:underline"
          >
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
          <p>
            {userProfile.created_at
              ? format(new Date(userProfile.created_at), 'yyyy/MM/dd HH:mm')
              : '-'}
          </p>
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
            onChange={(e) => setAdminNote(e.target.value)}
            rows={4}
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
</aside>

    {/* チャットエリア（左〜中央） */}
    <div className="flex-1 flex flex-col min-w-0 border-r border-[var(--color-border)]">

      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
        style={{
          background: 'rgba(23,18,13,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <Link
          href="/admin/conversations"
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <ChevronLeft size={20} />
        </Link>

        {queueInfo && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-[var(--color-text-muted)] font-mono">
              {queueInfo.pos + 1} / {queueInfo.total}
            </span>
            <button
              onClick={advanceToNext}
              className="text-xs px-2 py-1 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              title="スキップして次へ"
            >
              スキップ →
            </button>
          </div>
        )}

        {character && (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-[var(--color-border-warm)] flex-shrink-0">
              <img
                src={character.avatar_url}
                alt={character.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">
                {character.name} として返信
              </p>

              {userProfile && (
                <p className="text-[var(--color-text-muted)] text-xs truncate">
                  相手: {userProfile.display_name || userProfile.email || '匿名'} · {userProfile.points}T
                </p>
              )}
            </div>
          </div>
        )}
      </div>




      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-5 py-4"
        style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        {messages.map((msg, i) => {
          const isOp = msg.sender_role === 'character'

          const showDate =
            i === 0 ||
            new Date(msg.created_at).toDateString() !==
              new Date(messages[i - 1].created_at).toDateString()

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="text-center my-3">
                  <span
                    className="text-[var(--color-text-muted)] text-xs px-3 py-1 rounded-full"
                    style={{ background: 'var(--color-surface-2)' }}
                  >
                    {format(new Date(msg.created_at), 'M月d日(E)', {
                      locale: ja,
                    })}
                  </span>
                </div>
              )}

              <div
                className={`flex items-end gap-2 ${
                  isOp ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`max-w-[72%] flex flex-col gap-1 ${
                    isOp ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`px-4 py-2.5 text-sm leading-relaxed ${
                      isOp ? 'bubble-user' : 'bubble-operator'
                    }`}
                  >
                    {msg.content}
                  </div>

                  <span className="text-[var(--color-text-muted)] text-[11px] px-1">
                    {isOp
                      ? character?.name
                      : userProfile?.display_name ||
                        userProfile?.email ||
                        '匿名'}
                    {' · '}
                    {formatDistanceToNow(new Date(msg.created_at), {
                      addSuffix: true,
                      locale: ja,
                    })}
                  </span>
                </div>
              </div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="flex-shrink-0 px-5 py-4"
        style={{
          borderTop: '1px solid var(--color-border)',
          background: 'rgba(23,18,13,0.95)',
        }}
      >
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
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendReply()
              }
            }}
            rows={3}
            placeholder={`${character?.name}として返信… (Shift+Enterで改行)`}
            className="flex-1 input-warm px-4 py-2.5 text-sm resize-none"
          />

          <button
            onClick={sendReply}
            disabled={!input.trim() || sending}
            className="btn-primary px-4 flex items-center gap-1.5 text-sm disabled:opacity-40"
          >
            {sending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
            送信
          </button>
        </div>
      </div>

    </div> {/* ← ここでチャットエリア閉じるのが最重要 */}

    {/* 右サイドバー */}
    <aside className="w-80 flex-shrink-0 border-l border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col">
      <div className="p-4 border-b border-[var(--color-border)]">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <FileText size={16} /> やり取りメモ
        </h2>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        <textarea
          value={staffNote}
          onChange={(e) => setStaffNote(e.target.value)}
          className="flex-1 w-full bg-[var(--color-surface-2)] border border-[var(--color-border-warm)] rounded-lg p-3 text-sm resize-none"
          placeholder="ユーザーの特徴や流れをメモ..."
        />

        <button
          onClick={saveNote}
          disabled={noteLoading}
          className="w-full btn-primary py-2 text-xs flex items-center justify-center gap-2"
        >
          {noteLoading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          保存
        </button>

        {noteSaved && (
          <span className="text-green-400 text-xs text-center">
            保存済
          </span>
        )}
      </div>
    </aside>


  </div>
)
}