'use client'

import { useState, useCallback, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { FileText, CheckSquare, Square } from 'lucide-react'
import { ConvQueueLink } from '@/components/admin/ConvQueueLink'
import { BulkSendSection } from '@/components/admin/BulkSendSection'

const GENDER_LABEL: Record<string, string> = {
  male: '男性', female: '女性', other: 'その他',
}

type Conv = {
  id: string
  last_message_at: string
  is_unread_staff: boolean
  staff_note: string | null
  stack_count: number
  profiles: { id: string; user_code: string; display_name: string; email: string; age: number | null; gender: string | null; points: number } | null
  characters: { id: string; name: string; avatar_url: string } | null
}

export function SearchResults({
  conversations,
  isDedup,
  returnTo,
}: {
  conversations: Conv[]
  isDedup: boolean
  returnTo: string
}) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set(conversations.map(c => c.id)))

  // conversationsが変わったら(検索し直したら)チェック状態をリセット
  useEffect(() => {
    setChecked(new Set(conversations.map(c => c.id)))
  }, [conversations])

  const allChecked = checked.size === conversations.length
  const allConvIds = conversations.map(c => c.id)

  const toggleAll = useCallback(() => {
    setChecked(allChecked ? new Set() : new Set(conversations.map(c => c.id)))
  }, [allChecked, conversations])

  const toggle = useCallback((id: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectedConversations = conversations
    .filter(c => checked.has(c.id))
    .map(c => ({
      id: c.id,
      userName: c.profiles?.display_name ?? c.profiles?.email ?? '匿名',
      characterName: c.characters?.name ?? '',
    }))

  return (
    <>
      {/* 一括送信（重複なしモードのみ） */}
      {isDedup && conversations.length > 0 && (
        <BulkSendSection conversations={selectedConversations} />
      )}

      {/* 件数 + 全選択 */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-[var(--color-text-muted)]">
          {conversations.length}件
          {conversations.length === 100 && '（上限100件）'}
          {isDedup && ' · 重複なし'}
          {isDedup && checked.size < conversations.length && (
            <span className="ml-2" style={{ color: 'var(--color-primary)' }}>
              {checked.size}件選択中
            </span>
          )}
        </div>
        {isDedup && conversations.length > 0 && (
          <button
            onClick={toggleAll}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{
              color: allChecked ? 'var(--color-primary)' : 'var(--color-text-muted)',
              border: '1px solid var(--color-border-warm)',
              background: allChecked ? 'rgba(232,67,143,0.06)' : 'transparent',
            }}
          >
            {allChecked ? <CheckSquare size={13} /> : <Square size={13} />}
            {allChecked ? '全選択解除' : '全選択'}
          </button>
        )}
      </div>

      {/* 結果一覧 */}
      <div className="space-y-2">
        {conversations.map((conv) => {
          const profile = conv.profiles
          const character = conv.characters
          const isChecked = checked.has(conv.id)

          return (
            <div key={conv.id} className="flex items-stretch gap-2">
              {/* チェックボックス（重複なしモードのみ） */}
              {isDedup && (
                <button
                  onClick={() => toggle(conv.id)}
                  className="flex-shrink-0 flex items-center justify-center w-10 rounded-xl transition-colors"
                  style={{
                    background: isChecked ? 'rgba(232,67,143,0.08)' : 'rgba(0,0,0,0.04)',
                    border: isChecked ? '2px solid var(--color-primary)' : '2px solid transparent',
                  }}
                  aria-label={isChecked ? 'チェック解除' : 'チェック'}
                >
                  {isChecked
                    ? <CheckSquare size={16} style={{ color: 'var(--color-primary)' }} />
                    : <Square size={16} style={{ color: 'var(--color-text-muted)' }} />
                  }
                </button>
              )}

              <ConvQueueLink
                convId={conv.id}
                allConvIds={allConvIds}
                returnTo={returnTo}
                className={`flex-1 block glass rounded-xl px-5 py-4 hover:border-[var(--color-primary-light)]/40 transition-all ${
                  conv.is_unread_staff ? 'border-[var(--color-primary)]/40 ring-1 ring-[var(--color-primary)]/20' : ''
                } ${isDedup && !isChecked ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-[var(--color-border)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={character?.avatar_url} alt={character?.name} className="w-full h-full object-cover" />
                    </div>
                    {conv.is_unread_staff && (
                      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-400 border-2 border-[var(--color-bg)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          {profile?.display_name || profile?.email || '匿名ユーザー'}
                        </span>
                        {profile?.user_code && (
                          <span className="font-mono text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded">
                            {profile.user_code}
                          </span>
                        )}
                        {profile?.gender && (
                          <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded">
                            {GENDER_LABEL[profile.gender]}
                          </span>
                        )}
                        {profile?.age != null && (
                          <span className="text-xs text-[var(--color-text-muted)]">{profile.age}歳</span>
                        )}
                        <span className="text-xs text-[var(--color-text-muted)]">→ {character?.name}</span>
                      </div>
                      <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">
                        {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: ja })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-[var(--color-text-muted)]">残り: {profile?.points ?? 0}T</span>
                      {conv.stack_count > 0 && (
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded"
                          style={{
                            background: conv.stack_count >= 3 ? 'rgba(239,68,68,0.15)' : 'rgba(251,146,60,0.15)',
                            color: conv.stack_count >= 3 ? '#f87171' : '#fb923c',
                          }}>
                          積み{conv.stack_count}
                        </span>
                      )}
                      {conv.staff_note && (
                        <span className="flex items-center gap-1 text-xs text-amber-400">
                          <FileText size={11} />メモあり
                        </span>
                      )}
                      {conv.is_unread_staff && (
                        <span className="text-xs text-red-400 font-medium">● 未返信</span>
                      )}
                    </div>
                  </div>
                </div>
              </ConvQueueLink>
            </div>
          )
        })}

        {conversations.length === 0 && (
          <div className="text-center py-20 text-[var(--color-text-muted)]">
            <p>該当するやり取りがありません</p>
          </div>
        )}
      </div>
    </>
  )
}
