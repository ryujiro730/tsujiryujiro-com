'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, MessageSquare, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

type InquiryUser = {
  userId: string
  displayName: string
  email: string
  userCode: string | null
  openCount: number
  lastActivity: string
  lastPreview: string
}

export default function AdminInquiriesPage() {
  const router = useRouter()
  const [users, setUsers] = useState<InquiryUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/inquiries/users')
      .then(r => r.json())
      .then(d => { setUsers(d.users ?? []); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" style={{ color: 'var(--color-primary)' }} size={22} />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold">お問い合わせ</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">ユーザーごとのサポートスレッド</p>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-20 text-[var(--color-text-muted)]">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">問い合わせはありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <button
              key={u.userId}
              onClick={() => router.push(`/admin/inquiries/user/${u.userId}`)}
              className="w-full text-left card hover:border-[var(--color-border-warm)] transition-all p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-surface-2)' }}>
                <User size={18} style={{ color: 'var(--color-text-muted)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-sm">{u.displayName}</span>
                  {u.userCode && <span className="text-[11px] text-[var(--color-text-muted)] font-mono">{u.userCode}</span>}
                  {u.openCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: 'var(--color-primary)' }}>
                      未回答 {u.openCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--color-text-muted)] truncate">{u.lastPreview}</p>
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)] flex-shrink-0">
                {formatDistanceToNow(new Date(u.lastActivity), { addSuffix: true, locale: ja })}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
