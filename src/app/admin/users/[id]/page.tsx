'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Save, Loader2, Tag, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

type UserDetail = {
  id: string
  user_code: string
  email: string
  display_name: string | null
  age: number | null
  gender: string | null
  points: number
  admin_note: string | null
  last_login_at: string | null
  created_at: string
  referral_source: string | null
}

type Label = {
  id: string
  name: string
  color: string
}

type AssignedLabel = {
  label_id: string
}

type Conversation = {
  id: string
  last_message_at: string
  is_unread_staff: boolean
  characters: { name: string; avatar_url: string } | null
}

type Transaction = {
  id: string
  amount: number
  type: string
  description: string
  price_yen: number | null
  created_at: string
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<UserDetail | null>(null)
  const [labels, setLabels] = useState<Label[]>([])
  const [assignedLabelIds, setAssignedLabelIds] = useState<Set<string>>(new Set())
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [adminNote, setAdminNote] = useState('')
  const [noteLoading, setNoteLoading] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [newLabelName, setNewLabelName] = useState('')
  const [creatingLabel, setCreatingLabel] = useState(false)

  useEffect(() => {
    loadAll()
  }, [id])

  const loadAll = async () => {
    const [userRes, labelsRes, assignRes, convRes, txRes, noteRes] = await Promise.all([
      supabase.from('profiles').select('id, user_code, email, display_name, age, gender, points, last_login_at, created_at').eq('id', id).single(),
      supabase.from('admin_labels').select('*').order('name'),
      supabase.from('user_label_assignments').select('label_id').eq('user_id', id),
      supabase.from('conversations').select('id, last_message_at, is_unread_staff, characters(name, avatar_url)').eq('user_id', id).order('last_message_at', { ascending: false }).limit(10),
      supabase.from('point_transactions').select('id, amount, type, description, price_yen, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(20),
      fetch(`/api/admin/profile-note?userId=${id}`).then(r => r.json()),
    ])

    if (userRes.error) { setLoadError(userRes.error.message); setLoading(false); return }
    if (!userRes.data) { setLoadError('ユーザーが見つかりません'); setLoading(false); return }

    setUser(userRes.data as UserDetail)
    setAdminNote(noteRes.admin_note ?? '')
    setLabels(labelsRes.data ?? [])
    setAssignedLabelIds(new Set((assignRes.data ?? []).map((a: AssignedLabel) => a.label_id)))
    setConversations((convRes.data ?? []) as unknown as Conversation[])
    setTransactions((txRes.data ?? []) as Transaction[])
    setLoading(false)
  }

  const saveNote = async () => {
    setNoteLoading(true)
    const res = await fetch('/api/admin/profile-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id, note: adminNote }),
    })
    setNoteLoading(false)
    if (!res.ok) {
      const { error } = await res.json()
      alert('保存に失敗しました: ' + error)
      return
    }
    setNoteSaved(true)
    setTimeout(() => setNoteSaved(false), 2000)
  }

  const toggleLabel = async (labelId: string) => {
    const isAssigned = assignedLabelIds.has(labelId)
    if (isAssigned) {
      await supabase.from('user_label_assignments').delete().eq('user_id', id).eq('label_id', labelId)
      setAssignedLabelIds(prev => { const s = new Set(prev); s.delete(labelId); return s })
    } else {
      await supabase.from('user_label_assignments').insert({ user_id: id, label_id: labelId })
      setAssignedLabelIds(prev => { const s = new Set(prev); s.add(labelId); return s })
    }
  }

  const createLabel = async () => {
    if (!newLabelName.trim()) return
    setCreatingLabel(true)
    const { data } = await supabase.from('admin_labels').insert({ name: newLabelName.trim(), color: '#6366f1' }).select().single()
    if (data) {
      setLabels(prev => [...prev, data as Label].sort((a, b) => a.name.localeCompare(b.name)))
    }
    setNewLabelName('')
    setCreatingLabel(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" style={{ color: 'var(--color-primary)' }} size={22} />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-red-400 text-sm">エラー: {loadError}</p>
        <button onClick={() => { setLoading(true); setLoadError(null); loadAll() }} className="btn-primary px-4 py-2 text-sm">再試行</button>
      </div>
    )
  }

  if (!user) return null

  const totalCharged = transactions.filter(t => t.type === 'purchase').reduce((sum, t) => sum + (t.price_yen ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{user.display_name ?? '匿名ユーザー'}</h1>
          <p className="text-[var(--color-text-muted)] text-xs font-mono">{user.user_code} · {user.email}</p>
        </div>
      </div>

      {/* User info */}
      <div className="glass rounded-2xl p-5">
        <h2 className="text-sm font-semibold mb-4 text-[var(--color-text-muted)]">基本情報</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-[var(--color-text-muted)] text-xs">年齢</span><p>{user.age != null ? `${user.age}歳` : '—'}</p></div>
          <div><span className="text-[var(--color-text-muted)] text-xs">性別</span><p>{{ male: '男性', female: '女性', other: 'その他' }[user.gender ?? ''] ?? '—'}</p></div>
          <div><span className="text-[var(--color-text-muted)] text-xs">残高</span><p className="font-semibold">{user.points}T</p></div>
          <div><span className="text-[var(--color-text-muted)] text-xs">累計課金</span><p className="font-semibold">{totalCharged > 0 ? `¥${totalCharged.toLocaleString()}` : '—'}</p></div>
          <div><span className="text-[var(--color-text-muted)] text-xs">登録日</span><p>{new Date(user.created_at).toLocaleDateString('ja-JP')}</p></div>
          <div><span className="text-[var(--color-text-muted)] text-xs">最終ログイン</span><p>{user.last_login_at ? formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true, locale: ja }) : '—'}</p></div>
          <div className="col-span-2"><span className="text-[var(--color-text-muted)] text-xs">流入元</span><p>{user.referral_source ?? '—'}</p></div>
        </div>
      </div>

      {/* Labels */}
      <div className="glass rounded-2xl p-5">
        <h2 className="text-sm font-semibold mb-4 text-[var(--color-text-muted)] flex items-center gap-2">
          <Tag size={14} />ラベル
        </h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {labels.map(label => {
            const assigned = assignedLabelIds.has(label.id)
            return (
              <button
                key={label.id}
                onClick={() => toggleLabel(label.id)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-all border"
                style={{
                  backgroundColor: assigned ? label.color + '33' : 'var(--color-surface-2)',
                  borderColor: assigned ? label.color : 'var(--color-border)',
                  color: assigned ? label.color : 'var(--color-text-muted)',
                }}
              >
                {assigned && <span className="w-1.5 h-1.5 rounded-full" style={{ background: label.color }} />}
                {label.name}
              </button>
            )
          })}
        </div>
        {/* New label */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newLabelName}
            onChange={e => setNewLabelName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createLabel() }}
            placeholder="新しいラベルを作成…"
            className="flex-1 input-warm px-3 py-2 text-sm"
          />
          <button
            onClick={createLabel}
            disabled={!newLabelName.trim() || creatingLabel}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-40"
          >
            追加
          </button>
        </div>
      </div>

      {/* Admin note */}
      <div className="glass rounded-2xl p-5">
        <h2 className="text-sm font-semibold mb-4 text-[var(--color-text-muted)]">管理メモ（ユーザーには見えません）</h2>
        <textarea
          value={adminNote}
          onChange={e => setAdminNote(e.target.value)}
          rows={4}
          placeholder="このユーザーに関するメモを入力…"
          className="w-full input-warm px-4 py-3 text-sm resize-none mb-3"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={saveNote}
            disabled={noteLoading}
            className="btn-primary px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-40"
          >
            {noteLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            保存
          </button>
          {noteSaved && <span className="text-green-400 text-sm">保存しました</span>}
        </div>
      </div>

      {/* Conversations */}
      {conversations.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-4 text-[var(--color-text-muted)]">会話履歴（直近10件）</h2>
          <div className="space-y-2">
            {conversations.map(conv => (
              <Link
                key={conv.id}
                href={`/admin/conversations/${conv.id}`}
                className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[var(--color-surface-2)] transition-colors"
                style={{ border: '1px solid var(--color-border)' }}
              >
                <div className="flex items-center gap-3">
                  {conv.characters?.avatar_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={conv.characters.avatar_url} alt={conv.characters.name} className="w-8 h-8 rounded-full object-cover" />
                  )}
                  <span className="text-sm">{conv.characters?.name ?? '—'}</span>
                  {conv.is_unread_staff && <span className="text-xs text-red-400 font-medium">● 未返信</span>}
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: ja })}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Transactions */}
      {transactions.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-4 text-[var(--color-text-muted)]">ポイント履歴（直近20件）</h2>
          <div className="space-y-1">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between px-3 py-2 rounded-lg text-sm">
                <div>
                  <span className="text-[var(--color-text-muted)] text-xs mr-2">
                    {new Date(tx.created_at).toLocaleDateString('ja-JP')}
                  </span>
                  {tx.description}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {tx.price_yen != null && (
                    <span className="text-xs text-green-400">¥{tx.price_yen.toLocaleString()}</span>
                  )}
                  <span className={`font-medium ${tx.type === 'purchase' ? 'text-green-400' : 'text-[var(--color-text-muted)]'}`}>
                    {tx.type === 'purchase' ? '+' : '-'}{Math.abs(tx.amount)}T
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
