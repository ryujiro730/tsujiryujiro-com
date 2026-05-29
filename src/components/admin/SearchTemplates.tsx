'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bookmark, X, Loader2, Plus } from 'lucide-react'

type Template = {
  id: string
  name: string
  params: Record<string, string>
  created_at: string
  admin_id: string
}

// ─── テンプレート一覧（プリセット欄に並べる） ───────────────────────────
export function SavedTemplateList({ templates }: { templates: Template[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  if (templates.length === 0) return null

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('このテンプレートを削除しますか？')) return
    setDeleting(id)
    await fetch(`/api/admin/search-templates/${id}`, { method: 'DELETE' })
    setDeleting(null)
    router.refresh()
  }

  const buildUrl = (params: Record<string, string>) =>
    `/admin/conversations/search?${new URLSearchParams(params)}`

  return (
    <>
      {templates.map(t => (
        <div key={t.id} className="relative group">
          <a
            href={buildUrl(t.params)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-colors"
            style={{ background: 'rgba(232,67,143,0.06)', borderColor: 'var(--color-border-warm)', color: 'var(--color-primary)' }}
          >
            <Bookmark size={11} />
            {t.name}
          </a>
          <button
            onClick={e => handleDelete(e, t.id)}
            disabled={deleting === t.id}
            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white hidden group-hover:flex items-center justify-center"
          >
            {deleting === t.id ? <Loader2 size={8} className="animate-spin" /> : <X size={8} />}
          </button>
        </div>
      ))}
    </>
  )
}

// ─── 保存ボタン（フォーム内に置く） ─────────────────────────────────────
export function SaveTemplateButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim() || saving) return
    setSaving(true)

    // 現在のURLのsearch paramsを取得
    const params: Record<string, string> = {}
    const urlParams = new URLSearchParams(window.location.search)
    // sort/order/dedupは条件ではないが含める（テンプレートとして有用）
    urlParams.forEach((v, k) => { if (v) params[k] = v })

    const res = await fetch('/api/admin/search-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), params }),
    })

    setSaving(false)
    if (!res.ok) { alert('保存に失敗しました'); return }

    setName('')
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-ghost px-4 py-2 text-sm flex items-center gap-2"
      >
        <Bookmark size={14} />
        この条件をテンプレ保存
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="font-bold text-base mb-4 flex items-center gap-2">
              <Bookmark size={16} style={{ color: 'var(--color-primary)' }} />
              テンプレートに保存
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mb-3">現在のURL上の検索条件をそのまま保存します</p>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              placeholder="例: 未返信3日以上（高課金）"
              autoFocus
              className="input-warm w-full px-3 py-2 text-sm mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setOpen(false)} className="btn-ghost flex-1 py-2 text-sm">キャンセル</button>
              <button
                onClick={handleSave}
                disabled={!name.trim() || saving}
                className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
