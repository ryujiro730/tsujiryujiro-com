'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Pencil, Trash2, Plus, Check, X, Loader2 } from 'lucide-react'

type Label = {
  id: string
  name: string
  color: string
  created_at: string
  user_count?: number
}

const PRESET_COLORS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#84cc16',
  '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#6b7280',
]

export default function AdminLabelsPage() {
  const supabase = createClient()
  const [labels, setLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(true)

  // 新規作成
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6366f1')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // 編集中
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [saving, setSaving] = useState(false)

  // 削除確認
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const { data: labelData } = await supabase
      .from('admin_labels').select('*').order('created_at', { ascending: true })

    if (!labelData) { setLoading(false); return }

    // 各ラベルの使用ユーザー数を取得
    const { data: assignments } = await supabase
      .from('user_label_assignments').select('label_id')

    const countMap = new Map<string, number>()
    for (const a of assignments ?? []) {
      countMap.set(a.label_id, (countMap.get(a.label_id) ?? 0) + 1)
    }

    setLabels(labelData.map(l => ({ ...l, user_count: countMap.get(l.id) ?? 0 })))
    setLoading(false)
  }

  const createLabel = async () => {
    if (!newName.trim()) { setCreateError('ラベル名を入力してください'); return }
    setCreating(true)
    setCreateError('')
    const { error } = await supabase
      .from('admin_labels').insert({ name: newName.trim(), color: newColor })
    if (error) {
      setCreateError(error.message.includes('unique') ? 'このラベル名は既に存在します' : error.message)
      setCreating(false)
      return
    }
    setNewName('')
    setNewColor('#6366f1')
    setCreating(false)
    load()
  }

  const startEdit = (label: Label) => {
    setEditingId(label.id)
    setEditName(label.name)
    setEditColor(label.color)
  }

  const saveEdit = async () => {
    if (!editName.trim() || !editingId) return
    setSaving(true)
    const { error } = await supabase
      .from('admin_labels').update({ name: editName.trim(), color: editColor }).eq('id', editingId)
    setSaving(false)
    if (error) { alert(error.message); return }
    setEditingId(null)
    load()
  }

  const deleteLabel = async (id: string) => {
    await supabase.from('admin_labels').delete().eq('id', id)
    setDeletingId(null)
    load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[var(--color-primary)]" size={22} />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">ラベル管理</h1>
        <p className="text-[var(--color-text-muted)] text-sm">ユーザーに付けるラベルの追加・編集・削除ができます</p>
      </div>

      {/* 新規作成 */}
      <div className="glass rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-semibold mb-4 text-[var(--color-text-muted)]">新しいラベルを作成</h2>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createLabel() }}
            placeholder="ラベル名"
            className="input-warm flex-1 px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={newColor}
              onChange={e => setNewColor(e.target.value)}
              className="w-9 h-9 rounded-lg border border-[var(--color-border)] cursor-pointer p-0.5"
              title="色を選択"
            />
          </div>
          <button
            onClick={createLabel}
            disabled={creating || !newName.trim()}
            className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm disabled:opacity-40"
          >
            <Plus size={14} />
            {creating ? '作成中…' : '作成'}
          </button>
        </div>
        {/* プリセットカラー */}
        <div className="flex gap-1.5 flex-wrap">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setNewColor(c)}
              className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                background: c,
                borderColor: newColor === c ? 'var(--color-text)' : 'transparent',
              }}
            />
          ))}
        </div>
        {createError && <p className="text-red-400 text-xs mt-2">{createError}</p>}
      </div>

      {/* ラベル一覧 */}
      <div className="glass rounded-2xl p-5">
        <h2 className="text-sm font-semibold mb-4 text-[var(--color-text-muted)]">
          ラベル一覧 <span className="font-normal">({labels.length}件)</span>
        </h2>
        {labels.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">ラベルがありません</p>
        ) : (
          <div className="space-y-2">
            {labels.map(label => (
              <div
                key={label.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
              >
                {editingId === label.id ? (
                  // 編集モード
                  <>
                    <input
                      type="color"
                      value={editColor}
                      onChange={e => setEditColor(e.target.value)}
                      className="w-8 h-8 rounded-lg border border-[var(--color-border)] cursor-pointer p-0.5 flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                      className="input-warm flex-1 px-3 py-1.5 text-sm"
                      autoFocus
                    />
                    {/* プリセットカラー（編集時） */}
                    <div className="flex gap-1 flex-shrink-0">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                          style={{
                            background: c,
                            borderColor: editColor === c ? 'var(--color-text)' : 'transparent',
                          }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="flex-shrink-0 p-1.5 rounded-lg text-green-500 hover:bg-green-50 transition-colors"
                    >
                      {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-shrink-0 p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] transition-colors"
                    >
                      <X size={15} />
                    </button>
                  </>
                ) : deletingId === label.id ? (
                  // 削除確認
                  <>
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ background: label.color }}
                    />
                    <span className="flex-1 text-sm text-red-400">「{label.name}」を削除しますか？</span>
                    <button
                      onClick={() => deleteLabel(label.id)}
                      className="flex-shrink-0 px-3 py-1.5 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      削除する
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="flex-shrink-0 px-3 py-1.5 text-xs rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-2)] transition-colors"
                    >
                      キャンセル
                    </button>
                  </>
                ) : (
                  // 通常表示
                  <>
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ background: label.color }}
                    />
                    <span
                      className="px-2.5 py-0.5 rounded-full text-sm font-medium flex-shrink-0"
                      style={{ background: label.color + '22', color: label.color, border: `1px solid ${label.color}55` }}
                    >
                      {label.name}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)] flex-1">
                      {label.user_count ? `${label.user_count}人に付与` : '未使用'}
                    </span>
                    <button
                      onClick={() => startEdit(label)}
                      className="flex-shrink-0 p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeletingId(label.id)}
                      className="flex-shrink-0 p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-red-50 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
