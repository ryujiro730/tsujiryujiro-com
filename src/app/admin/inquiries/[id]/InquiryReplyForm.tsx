'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'

export default function InquiryReplyForm({ inquiryId, status }: { inquiryId: string; status: string }) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async () => {
    if (!message.trim()) return
    setSending(true)
    setError('')
    const res = await fetch(`/api/admin/inquiries/${inquiryId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
    if (res.ok) {
      setMessage('')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error ?? '送信に失敗しました')
    }
    setSending(false)
  }

  const handleClose = async () => {
    await fetch(`/api/admin/inquiries/${inquiryId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: status === 'closed' ? 'open' : 'closed' }),
    })
    router.refresh()
  }

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold mb-3">返信する</h3>
      <textarea
        className="input-warm w-full px-3 py-2.5 text-sm resize-none mb-3"
        rows={4}
        placeholder="返信メッセージを入力…"
        value={message}
        onChange={e => setMessage(e.target.value)}
      />
      {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="btn-primary flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-40"
        >
          <Send size={14} />
          {sending ? '送信中…' : '返信を送る'}
        </button>
        <button
          onClick={handleClose}
          className="px-4 py-2 text-sm rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] transition-colors"
        >
          {status === 'closed' ? '再オープン' : 'クローズ'}
        </button>
      </div>
    </div>
  )
}
