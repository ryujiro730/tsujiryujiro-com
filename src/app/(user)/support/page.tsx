'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Send, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

type Inquiry = {
  id: string
  subject: string
  status: string
  created_at: string
  inquiry_replies: { id: string }[]
}

type Reply = {
  id: string
  sender_role: string
  message: string
  created_at: string
}

type InquiryDetail = {
  id: string
  subject: string
  message: string
  status: string
  created_at: string
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  open:     { label: '未回答', color: 'var(--color-text-muted)' },
  answered: { label: '回答済み', color: 'var(--color-primary)' },
  closed:   { label: 'クローズ', color: 'var(--color-text-muted)' },
}

export default function SupportPage() {
  const router = useRouter()
  const [view, setView] = useState<'list' | 'new' | 'detail'>('list')
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)

  // 新規フォーム
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // 詳細
  const [detail, setDetail] = useState<InquiryDetail | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => { loadList() }, [])

  const loadList = async () => {
    setLoading(true)
    const res = await fetch('/api/support/inquiries')
    if (res.status === 401) { router.push('/auth/login'); return }
    const data = await res.json()
    setInquiries(data.inquiries ?? [])
    setLoading(false)
  }

  const openDetail = async (id: string) => {
    setDetailLoading(true)
    setView('detail')
    const res = await fetch(`/api/support/inquiries/${id}`)
    const data = await res.json()
    setDetail(data.inquiry)
    setReplies(data.replies ?? [])
    setDetailLoading(false)
  }

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      setSubmitError('件名とメッセージを入力してください')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    const res = await fetch('/api/support/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, message }),
    })
    if (res.ok) {
      setSubject('')
      setMessage('')
      await loadList()
      setView('list')
    } else {
      const data = await res.json()
      setSubmitError(data.error ?? '送信に失敗しました')
    }
    setSubmitting(false)
  }

  if (view === 'new') {
    return (
      <div>
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => setView('list')} className="p-1 -ml-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-lg font-bold">新しいお問い合わせ</h1>
        </div>

        <div className="card p-5 flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">件名</label>
            <input
              className="input-warm w-full px-3 py-2.5 text-sm"
              placeholder="お問い合わせの件名"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">メッセージ</label>
            <textarea
              className="input-warm w-full px-3 py-2.5 text-sm resize-none"
              rows={6}
              placeholder="お問い合わせの内容を詳しく入力してください"
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>
          {submitError && <p className="text-red-500 text-xs">{submitError}</p>}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary flex items-center justify-center gap-2 py-2.5 disabled:opacity-40"
          >
            <Send size={15} />
            {submitting ? '送信中…' : '送信する'}
          </button>
        </div>
      </div>
    )
  }

  if (view === 'detail') {
    return (
      <div>
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => setView('list')} className="p-1 -ml-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-lg font-bold">お問い合わせ詳細</h1>
        </div>

        {detailLoading ? (
          <div className="flex justify-center py-12">
            <div className="flex gap-1.5"><div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" /></div>
          </div>
        ) : detail ? (
          <div className="flex flex-col gap-3">
            {/* 元のメッセージ */}
            <div className="card p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h2 className="font-semibold text-sm">{detail.subject}</h2>
                <span className="text-[11px] flex-shrink-0" style={{ color: STATUS_LABEL[detail.status]?.color }}>
                  {STATUS_LABEL[detail.status]?.label}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
                {format(new Date(detail.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
              </p>
              <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{detail.message}</p>
              </div>
            </div>

            {/* スレッド */}
            {replies.length > 0 && (
              <div className="flex flex-col gap-2">
                {replies.map(reply => (
                  <div key={reply.id} className={`card p-4 ${reply.sender_role === 'staff' ? 'border-[var(--color-primary)]' : ''}`}
                    style={reply.sender_role === 'staff' ? { borderColor: 'var(--color-primary)', borderWidth: '1px' } : {}}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold" style={{ color: reply.sender_role === 'staff' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                        {reply.sender_role === 'staff' ? 'サポートチーム' : 'あなた'}
                      </span>
                      <span className="text-[11px] text-[var(--color-text-muted)]">
                        {format(new Date(reply.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{reply.message}</p>
                  </div>
                ))}
              </div>
            )}

            {replies.length === 0 && (
              <p className="text-center text-sm text-[var(--color-text-muted)] py-4">
                返信をお待ちください
              </p>
            )}
          </div>
        ) : null}
      </div>
    )
  }

  // リスト画面
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 pt-1">
        <Link href="/settings" className="p-1 -ml-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          <ChevronLeft size={22} />
        </Link>
        <h1 className="text-xl font-bold">お問い合わせ</h1>
      </div>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        お困りのことがあればお気軽にご連絡ください。
      </p>

      <button
        onClick={() => setView('new')}
        className="btn-primary w-full flex items-center justify-center gap-2 py-3 mb-6"
      >
        <MessageSquare size={16} />
        新しいお問い合わせ
      </button>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="flex gap-1.5"><div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" /></div>
        </div>
      ) : inquiries.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">お問い合わせ履歴はありません</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] mb-1">送信済み</h2>
          {inquiries.map(inq => (
            <button
              key={inq.id}
              onClick={() => openDetail(inq.id)}
              className="card p-4 text-left flex items-center gap-3 hover:bg-[var(--color-surface-2)] transition-colors w-full"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium truncate">{inq.subject}</p>
                  {inq.inquiry_replies.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-semibold"
                      style={{ background: 'var(--color-primary)', color: '#fff' }}>
                      返信あり
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  {format(new Date(inq.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}

                  <span style={{ color: STATUS_LABEL[inq.status]?.color }}>{STATUS_LABEL[inq.status]?.label}</span>
                </p>
              </div>
              <ChevronRight size={16} className="text-[var(--color-text-muted)] flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
