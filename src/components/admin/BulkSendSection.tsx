'use client'

import { useState, useEffect } from 'react'
import { Send, Loader2, AlertTriangle, CheckCircle2, Clock, Trash2, Calendar } from 'lucide-react'

type Conv = { id: string; userName: string; characterName: string }

type Schedule = {
  id: string
  message: string
  scheduled_at: string
  status: string
  sent_count: number | null
  conversation_ids: string[]
}

function ScheduleList({ conversationIds }: { conversationIds: string[] }) {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/bulk-send/schedule')
    if (res.ok) {
      const data = await res.json()
      // 現在の検索結果のconversation_idsと重複するものだけ表示
      const convSet = new Set(conversationIds)
      setSchedules((data.schedules ?? []).filter((s: Schedule) =>
        s.status === 'pending' &&
        (s.conversation_ids as string[]).some(id => convSet.has(id))
      ))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const cancel = async (id: string) => {
    if (!confirm('この予約を取り消しますか？')) return
    setCancelling(id)
    await fetch(`/api/admin/bulk-send/schedule/${id}`, { method: 'DELETE' })
    setCancelling(null)
    load()
  }

  if (loading) return null
  if (!schedules.length) return null

  return (
    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border-warm)' }}>
      <p className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-primary)' }}>
        <Clock size={12} />予約中の送信
      </p>
      <div className="flex flex-col gap-2">
        {schedules.map(s => (
          <div key={s.id} className="flex items-start justify-between gap-3 rounded-xl px-3 py-2 text-xs"
            style={{ background: 'rgba(232,67,143,0.06)', border: '1px solid var(--color-border-warm)' }}>
            <div className="flex-1 min-w-0">
              <p className="text-[var(--color-text-muted)] mb-0.5">
                {new Date(s.scheduled_at).toLocaleString('ja-JP', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                　{s.conversation_ids.length}件
              </p>
              <p className="truncate text-[var(--color-text-main)]">{s.message}</p>
            </div>
            <button onClick={() => cancel(s.id)} disabled={cancelling === s.id}
              className="flex-shrink-0 text-[var(--color-text-muted)] hover:text-red-400 transition-colors disabled:opacity-40">
              {cancelling === s.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function BulkSendSection({ conversations }: { conversations: Conv[] }) {
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState<'now' | 'schedule'>('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; scheduled?: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scheduleKey, setScheduleKey] = useState(0)

  // 最小日時（現在+5分）
  const minDatetime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)

  const handleSend = async () => {
    if (!message.trim() || sending) return
    if (mode === 'schedule' && !scheduledAt) {
      setError('送信日時を選択してください')
      return
    }
    setError(null)
    setResult(null)

    const confirmMsg = mode === 'now'
      ? `【確認】\n${conversations.length}件の会話に以下のメッセージを送信します。\n\n"${message.trim().slice(0, 80)}${message.length > 80 ? '…' : ''}"\n\n実行しますか？`
      : `【確認】\n${conversations.length}件の会話に以下のメッセージを予約します。\n\n送信日時: ${new Date(scheduledAt).toLocaleString('ja-JP')}\n\n"${message.trim().slice(0, 80)}${message.length > 80 ? '…' : ''}"\n\n予約しますか？`

    if (!confirm(confirmMsg)) return

    setSending(true)

    let res: Response
    if (mode === 'now') {
      res = await fetch('/api/admin/bulk-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationIds: conversations.map(c => c.id),
          message: message.trim(),
        }),
      })
    } else {
      res = await fetch('/api/admin/bulk-send/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationIds: conversations.map(c => c.id),
          message: message.trim(),
          scheduledAt: new Date(scheduledAt).toISOString(),
        }),
      })
    }

    const data = await res.json()
    setSending(false)

    if (!res.ok) {
      setError(data.error ?? '送信に失敗しました')
    } else {
      setResult({ sent: conversations.length, scheduled: mode === 'schedule' })
      setMessage('')
      setScheduledAt('')
      if (mode === 'schedule') setScheduleKey(k => k + 1)
    }
  }

  const convIds = conversations.map(c => c.id)

  return (
    <div className="rounded-2xl border-2 mb-6 overflow-hidden"
      style={{ borderColor: 'var(--color-border-warm)', background: 'rgba(232,67,143,0.03)' }}>

      {/* ヘッダー */}
      <div className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: '1px solid var(--color-border-warm)', background: 'rgba(232,67,143,0.06)' }}>
        <div className="flex items-center gap-2">
          <Send size={15} style={{ color: 'var(--color-primary)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>一括送信</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ background: 'var(--color-primary)' }}>
            {conversations.length}件
          </span>
        </div>
        {/* モード切替 */}
        <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: 'rgba(232,67,143,0.1)' }}>
          <button
            onClick={() => setMode('now')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${mode === 'now' ? 'text-white' : 'text-[var(--color-text-muted)]'}`}
            style={mode === 'now' ? { background: 'var(--color-primary)' } : {}}>
            今すぐ
          </button>
          <button
            onClick={() => setMode('schedule')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${mode === 'schedule' ? 'text-white' : 'text-[var(--color-text-muted)]'}`}
            style={mode === 'schedule' ? { background: 'var(--color-primary)' } : {}}>
            <Calendar size={11} />予約
          </button>
        </div>
      </div>

      {/* 送信エリア */}
      <div className="px-5 py-4">
        {result ? (
          <div className="flex items-center gap-3 py-3">
            <CheckCircle2 size={22} className="text-green-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-green-400">
                {result.scheduled ? `${result.sent}件に予約しました` : `${result.sent}件に送信しました`}
              </p>
              <button onClick={() => setResult(null)} className="text-xs text-[var(--color-text-muted)] underline mt-0.5">
                続けて送信する
              </button>
            </div>
          </div>
        ) : (
          <>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              placeholder={`送信するメッセージを入力…\n例: $nickname$さん、久しぶりだね！待ってたよ♡`}
              className="w-full input-warm px-4 py-3 text-sm resize-none mb-3"
            />

            {mode === 'schedule' && (
              <div className="mb-3">
                <label className="text-xs text-[var(--color-text-muted)] mb-1 flex items-center gap-1">
                  <Clock size={11} />送信日時
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  min={minDatetime}
                  className="input-warm px-3 py-2 text-sm w-full"
                />
              </div>
            )}

            {error && (
              <p className="text-red-400 text-xs mb-3 flex items-center gap-1.5">
                <AlertTriangle size={12} />{error}
              </p>
            )}
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--color-text-muted)]">
                $nickname$ 等の変数が使えます
              </p>
              <button
                onClick={handleSend}
                disabled={!message.trim() || sending || conversations.length === 0 || (mode === 'schedule' && !scheduledAt)}
                className="btn-cta px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending
                  ? <><Loader2 size={15} className="animate-spin" />{mode === 'schedule' ? '予約中…' : '送信中…'}</>
                  : mode === 'schedule'
                    ? <><Calendar size={15} />{conversations.length}件に予約送信</>
                    : <><Send size={15} />{conversations.length}件に一括送信</>
                }
              </button>
            </div>
          </>
        )}

        <ScheduleList key={scheduleKey} conversationIds={convIds} />
      </div>
    </div>
  )
}
