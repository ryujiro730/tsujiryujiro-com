'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Loader2, Send, User } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

type ChatMsg = {
  id: string
  role: 'user' | 'staff'
  message: string
  subject?: string
  inquiryId: string
  inquiryStatus?: string
  created_at: string
  senderName?: string
}

type Profile = {
  id: string
  display_name: string
  email: string
  user_code: string | null
  points: number
}

export default function AdminInquiryUserPage() {
  const { userId } = useParams<{ userId: string }>()
  const router = useRouter()

  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [latestInquiryId, setLatestInquiryId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    loadData()
  }, [userId])

  useEffect(() => { scrollToBottom() }, [messages])

  const loadData = async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/inquiries/user/${userId}`)
    if (!res.ok) { router.push('/admin/inquiries'); return }
    const { profile: p, messages: msgs, latestInquiryId: lid } = await res.json()
    setProfile(p)
    setMessages(msgs ?? [])
    setLatestInquiryId(lid ?? null)
    setLoading(false)
    setTimeout(() => textareaRef.current?.focus(), 80)
  }

  const sendReply = async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const res = await fetch(`/api/admin/inquiries/user/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, inquiryId: latestInquiryId }),
    })

    if (!res.ok) {
      alert('送信に失敗しました')
      setInput(text)
      setSending(false)
      return
    }

    const { reply } = await res.json()
    setMessages(prev => [...prev, {
      id: reply.id,
      role: 'staff',
      message: reply.message,
      inquiryId: reply.inquiry_id,
      created_at: reply.created_at,
    }])
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendReply()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" style={{ color: 'var(--color-primary)' }} size={22} />
      </div>
    )
  }

  // 日付セパレーターを挿入するためのメッセージリストを構築
  type Row = { type: 'date'; date: string } | { type: 'msg'; msg: ChatMsg }
  const rows: Row[] = []
  let lastDate = ''
  for (const msg of messages) {
    const d = format(new Date(msg.created_at), 'yyyy年M月d日(E)', { locale: ja })
    if (d !== lastDate) {
      rows.push({ type: 'date', date: d })
      lastDate = d
    }
    rows.push({ type: 'msg', msg })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] -my-6 overflow-hidden">

      {/* ヘッダー */}
      <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <button onClick={() => router.push('/admin/inquiries')} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--color-surface-2)' }}>
          <User size={15} style={{ color: 'var(--color-text-muted)' }} />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">{profile?.display_name ?? '不明'}</p>
          <p className="text-[11px] text-[var(--color-text-muted)]">{profile?.email}</p>
        </div>
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {rows.length === 0 && (
          <p className="text-center text-sm text-[var(--color-text-muted)] mt-10">メッセージがありません</p>
        )}
        {rows.map((row, i) => {
          if (row.type === 'date') {
            return (
              <div key={`date-${i}`} className="flex justify-center py-2">
                <span className="text-[11px] text-[var(--color-text-muted)] px-3 py-1 rounded-full" style={{ background: 'var(--color-surface-2)' }}>
                  {row.date}
                </span>
              </div>
            )
          }

          const msg = row.msg
          const isUser = msg.role === 'user'

          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
              <div style={{ maxWidth: '72%' }}>
                {/* 件名ラベル（ユーザーの問い合わせ本文の場合） */}
                {msg.subject && (
                  <p className="text-[11px] text-[var(--color-text-muted)] mb-1 ml-1">
                    件名: {msg.subject}
                  </p>
                )}
                <div
                  className={isUser ? 'bubble-operator' : 'bubble-user'}
                  style={{ padding: '10px 14px', display: 'inline-block', maxWidth: '100%' }}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                </div>
                <p className={`text-[10px] text-[var(--color-text-muted)] mt-1 ${isUser ? 'ml-1' : 'text-right mr-1'}`}>
                  {format(new Date(msg.created_at), 'HH:mm')}
                  {!isUser && msg.senderName && ` · ${msg.senderName}`}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 返信入力 */}
      <div className="flex-shrink-0 px-5 py-4" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        {!latestInquiryId ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-2">問い合わせがないため返信できません</p>
        ) : (
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder="返信を入力… (Enterで送信、Shift+Enterで改行)"
              className="flex-1 input-warm px-4 py-2.5 text-sm resize-none"
            />
            <button
              onClick={sendReply}
              disabled={!input.trim() || sending}
              className="btn-primary px-4 py-2.5 flex items-center gap-1.5 text-sm disabled:opacity-40 flex-shrink-0"
            >
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              送信
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
