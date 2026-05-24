'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Send } from 'lucide-react'
import Image from 'next/image'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

type ChatMessage = {
  id: string
  role: 'user' | 'staff'
  message: string
  created_at: string
}

const SUPPORT_SUBJECT = 'お問い合わせ'

export default function SupportPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [openInquiryId, setOpenInquiryId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { loadHistory() }, [])
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadHistory = async () => {
    setLoading(true)
    const res = await fetch('/api/support/inquiries')
    if (res.status === 401) { router.push('/auth/login'); return }
    const data = await res.json()
    const inquiries: Array<{ id: string; subject: string; status: string; message: string; created_at: string; inquiry_replies: { id: string }[] }> = data.inquiries ?? []

    // 全お問い合わせのメッセージをチャット形式に展開
    const allMessages: ChatMessage[] = []

    for (const inq of inquiries) {
      // 元のお問い合わせメッセージ
      allMessages.push({ id: `inq-${inq.id}`, role: 'user', message: inq.message, created_at: inq.created_at })

      // 返信を取得
      if (inq.inquiry_replies.length > 0) {
        const detailRes = await fetch(`/api/support/inquiries/${inq.id}`)
        const detailData = await detailRes.json()
        for (const reply of detailData.replies ?? []) {
          allMessages.push({
            id: `reply-${reply.id}`,
            role: reply.sender_role === 'staff' ? 'staff' : 'user',
            message: reply.message,
            created_at: reply.created_at,
          })
        }
      }

      // 未クローズのお問い合わせを追跡（返信先として使う）
      if (inq.status !== 'closed') {
        setOpenInquiryId(inq.id)
      }
    }

    // 時系列順にソート
    allMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    setMessages(allMessages)
    setLoading(false)
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')

    // 楽観的に表示
    const tempId = `temp-${Date.now()}`
    const tempMsg: ChatMessage = { id: tempId, role: 'user', message: text, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, tempMsg])

    const res = await fetch('/api/support/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: SUPPORT_SUBJECT, message: text }),
    })

    if (res.ok) {
      const data = await res.json()
      const newId = data.inquiry?.id ?? data.id
      if (newId) setOpenInquiryId(newId)
      // 一時メッセージを確定IDで置き換え
      setMessages(prev => prev.map(m => m.id === tempId
        ? { ...m, id: newId ? `inq-${newId}` : m.id }
        : m
      ))
    } else {
      // 失敗したら一時メッセージを削除
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setInput(text)
    }

    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const adjustTextarea = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  return (
    <div className="fixed flex flex-col" style={{ top: '52px', left: 0, right: 0, bottom: '56px' }}>
      {/* ヘッダー */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
      >
        <button
          onClick={() => router.back()}
          className="p-1 -ml-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 relative"
          style={{ background: 'linear-gradient(135deg, rgba(232,121,160,0.2), rgba(196,80,128,0.1))' }}>
          <Image
            src="/support-character.png"
            alt="サポート"
            fill
            style={{ objectFit: 'cover', objectPosition: 'top center' }}
          />
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight">サポートチーム</p>
          <p className="text-[11px] text-[var(--color-text-muted)]">お気軽にご相談ください</p>
        </div>
      </div>

      {/* チャットエリア */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 relative">
        {/* 背景キャラクター */}
        <div className="pointer-events-none select-none" style={{ position: 'absolute', inset: 0, opacity: 0.18, zIndex: 0 }}>
          <Image src="/support-character.png" alt="" fill style={{ objectFit: 'contain', objectPosition: 'center center' }} />
        </div>

        {/* ウェルカムメッセージ */}
        <div className="flex items-end gap-2 max-w-[80%]" style={{ position: 'relative', zIndex: 1 }}>
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 relative border"
            style={{ borderColor: 'var(--color-border)', background: '#fff' }}>
            <Image src="/support-character.png" alt="サポート" fill style={{ objectFit: 'cover', objectPosition: 'top center' }} />
          </div>
          <div>
            <div
              className="px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm leading-relaxed"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text)' }}
            >
              こんにちは！サポートチームです😊<br />
              ご不明な点やお困りのことがあれば、お気軽にメッセージをどうぞ。
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="flex gap-1.5">
              <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
            </div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isUser = msg.role === 'user'
            const showDate = i === 0 || (
              new Date(msg.created_at).toDateString() !== new Date(messages[i - 1].created_at).toDateString()
            )
            return (
              <div key={msg.id} style={{ position: 'relative', zIndex: 1 }}>
                {showDate && (
                  <div className="text-center my-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                      {format(new Date(msg.created_at), 'M月d日（E）', { locale: ja })}
                    </span>
                  </div>
                )}
                <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 relative border"
                      style={{ borderColor: 'var(--color-border)', background: '#fff' }}>
                      <Image src="/support-character.png" alt="サポート" fill style={{ objectFit: 'cover', objectPosition: 'top center' }} />
                    </div>
                  )}
                  <div className={`flex flex-col gap-1 max-w-[72%] ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                        isUser ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm'
                      }`}
                      style={isUser
                        ? { background: 'var(--color-primary)', color: '#fff' }
                        : { background: 'var(--color-surface-2)', color: 'var(--color-text)' }
                      }
                    >
                      {msg.message}
                    </div>
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      {format(new Date(msg.created_at), 'HH:mm', { locale: ja })}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}

        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      <div
        className="flex-shrink-0 px-3 py-3 flex items-end gap-2"
        style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => { setInput(e.target.value); adjustTextarea() }}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力…"
          rows={1}
          className="flex-1 px-4 py-2.5 text-sm resize-none rounded-2xl outline-none"
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            maxHeight: '120px',
            lineHeight: '1.5',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
          style={{ background: 'var(--color-primary)' }}
        >
          <Send size={16} className="text-white" style={{ transform: 'translateX(1px)' }} />
        </button>
      </div>
    </div>
  )
}
