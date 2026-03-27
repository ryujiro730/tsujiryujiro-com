'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit2, Trash2, Loader2, Check, X } from 'lucide-react'
import type { Character } from '@/types'

export default function AdminCharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Character | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    age: 25,
    description: '',
    personality: '',
    avatar_url: '',
    is_active: true,
  })
  const supabase = createClient()

  useEffect(() => { loadCharacters() }, [])

  const loadCharacters = async () => {
    const { data } = await supabase
      .from('characters')
      .select('*')
      .order('created_at', { ascending: true })
    setCharacters(data || [])
    setLoading(false)
  }

  const startEdit = (char: Character) => {
    setEditing(char)
    setIsNew(false)
    setForm({
      name: char.name,
      age: char.age,
      description: char.description,
      personality: char.personality,
      avatar_url: char.avatar_url,
      is_active: char.is_active,
    })
  }

  const startNew = () => {
    setEditing(null)
    setIsNew(true)
    setForm({ name: '', age: 25, description: '', personality: '', avatar_url: '', is_active: true })
  }

  const cancel = () => {
    setEditing(null)
    setIsNew(false)
  }

  const save = async () => {
    setSaving(true)
    if (isNew) {
      const { data } = await supabase.from('characters').insert({
        ...form,
        reply_cost_points: 1,
      }).select().single()
      if (data) setCharacters(prev => [...prev, data])
    } else if (editing) {
      const { data } = await supabase.from('characters')
        .update(form)
        .eq('id', editing.id)
        .select().single()
      if (data) setCharacters(prev => prev.map(c => c.id === data.id ? data : c))
    }
    setEditing(null)
    setIsNew(false)
    setSaving(false)
  }

  const deleteChar = async (id: string) => {
    if (!confirm('このキャラクターを削除しますか？')) return
    await supabase.from('characters').delete().eq('id', id)
    setCharacters(prev => prev.filter(c => c.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[var(--color-primary)]" size={28} />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">キャラクター管理</h1>
        <button onClick={startNew} className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5">
          <Plus size={16} />
          追加
        </button>
      </div>

      {/* フォーム (新規 or 編集) */}
      {(isNew || editing) && (
        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="font-semibold mb-4">{isNew ? '新しいキャラクターを追加' : 'キャラクターを編集'}</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">名前</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="例：さくら"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">年齢</label>
                <input
                  type="number"
                  value={form.age}
                  onChange={e => setForm(f => ({ ...f, age: parseInt(e.target.value) || 25 }))}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">アバターURL</label>
              <input
                value={form.avatar_url}
                onChange={e => setForm(f => ({ ...f, avatar_url: e.target.value }))}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">一言プロフィール</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-[var(--color-primary)]"
                placeholder="例：話を聞くのが得意な元カフェ店員。明るくて聞き上手。"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">性格タグ</label>
              <input
                value={form.personality}
                onChange={e => setForm(f => ({ ...f, personality: e.target.value }))}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                placeholder="例：聞き上手 / 明るい / 共感力高め"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="is_active" className="text-sm">公開中（ユーザーに表示する）</label>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button
              onClick={save}
              disabled={saving || !form.name}
              className="btn-primary px-5 py-2.5 text-sm flex items-center gap-1.5 disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              保存
            </button>
            <button onClick={cancel} className="btn-ghost px-5 py-2.5 text-sm flex items-center gap-1.5">
              <X size={14} />
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* キャラクター一覧 */}
      <div className="space-y-3">
        {characters.map((char) => (
          <div key={char.id} className="glass rounded-2xl px-5 py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-[var(--color-border)] flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={char.avatar_url} alt={char.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-sm">{char.name}</span>
                <span className="text-xs text-[var(--color-text-muted)]">{char.age}歳</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${char.is_active ? 'bg-emerald-900/40 text-emerald-400' : 'bg-gray-800 text-gray-500'}`}>
                  {char.is_active ? '公開中' : '非公開'}
                </span>
              </div>
              <p className="text-[var(--color-text-muted)] text-xs truncate">{char.description}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => startEdit(char)}
                className="p-2 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => deleteChar(char.id)}
                className="p-2 rounded-lg hover:bg-red-900/30 transition-colors text-[var(--color-text-muted)] hover:text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
