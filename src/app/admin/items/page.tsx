'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit2, Trash2, Loader2, Check, X, Upload, Gift, Tag } from 'lucide-react'
import type { Item, ItemCategory } from '@/types'

async function compressImage(file: File, maxSize = 800, quality = 0.85): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxSize || height > maxSize) {
        if (width > height) { height = Math.round(height * maxSize / width); width = maxSize }
        else { width = Math.round(width * maxSize / height); height = maxSize }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => resolve(blob ?? file), 'image/webp', quality)
    }
    img.src = url
  })
}

export default function AdminItemsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Item | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    image_url: '',
    price_points: 10,
    sort_order: 0,
    is_active: true,
    category_id: '',
  })

  // カテゴリー管理
  const [newCatName, setNewCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [editingCat, setEditingCat] = useState<ItemCategory | null>(null)
  const [editCatName, setEditCatName] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const [{ data: itemsData }, { data: catsData }] = await Promise.all([
      supabase.from('items').select('*, category:item_categories(*)').order('sort_order').order('created_at'),
      supabase.from('item_categories').select('*').order('sort_order').order('created_at'),
    ])
    setItems(itemsData ?? [])
    setCategories(catsData ?? [])
    setLoading(false)
  }

  // --- カテゴリーCRUD ---
  const addCategory = async () => {
    if (!newCatName.trim()) return
    setAddingCat(true)
    const { data } = await supabase
      .from('item_categories')
      .insert({ name: newCatName.trim(), sort_order: categories.length })
      .select().single()
    if (data) setCategories(prev => [...prev, data])
    setNewCatName('')
    setAddingCat(false)
  }

  const saveCategory = async () => {
    if (!editingCat || !editCatName.trim()) return
    const { data } = await supabase
      .from('item_categories')
      .update({ name: editCatName.trim() })
      .eq('id', editingCat.id)
      .select().single()
    if (data) setCategories(prev => prev.map(c => c.id === data.id ? data : c))
    setEditingCat(null)
  }

  const deleteCategory = async (id: string) => {
    if (!confirm('このジャンルを削除しますか？（アイテムのジャンルはなしになります）')) return
    await supabase.from('item_categories').delete().eq('id', id)
    setCategories(prev => prev.filter(c => c.id !== id))
    setItems(prev => prev.map(i => i.category_id === id ? { ...i, category_id: null, category: null } : i))
  }

  // --- アイテムCRUD ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const compressed = await compressImage(file)
    const fileName = `items/${Date.now()}.webp`
    const { error } = await supabase.storage
      .from('avatars')
      .upload(fileName, compressed, { upsert: true, contentType: 'image/webp' })
    if (error) { alert('アップロード失敗: ' + error.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
    setForm(f => ({ ...f, image_url: publicUrl }))
    setUploading(false)
  }

  const startNew = () => {
    setIsNew(true); setEditing(null)
    setForm({ name: '', description: '', image_url: '', price_points: 10, sort_order: 0, is_active: true, category_id: '' })
  }

  const startEdit = (item: Item) => {
    setEditing(item); setIsNew(false)
    setForm({
      name: item.name,
      description: item.description ?? '',
      image_url: item.image_url ?? '',
      price_points: item.price_points,
      sort_order: item.sort_order,
      is_active: item.is_active,
      category_id: item.category_id ?? '',
    })
  }

  const cancel = () => { setEditing(null); setIsNew(false) }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      image_url: form.image_url || null,
      price_points: form.price_points,
      sort_order: form.sort_order,
      is_active: form.is_active,
      category_id: form.category_id || null,
    }
    if (isNew) {
      const { data, error } = await supabase.from('items').insert(payload).select('*, category:item_categories(*)').single()
      if (error) { alert('保存失敗: ' + error.message); setSaving(false); return }
      if (data) setItems(prev => [...prev, data])
    } else if (editing) {
      const { data, error } = await supabase.from('items').update(payload).eq('id', editing.id).select('*, category:item_categories(*)').single()
      if (error) { alert('保存失敗: ' + error.message); setSaving(false); return }
      if (data) setItems(prev => prev.map(i => i.id === data.id ? data : i))
    }
    setEditing(null); setIsNew(false); setSaving(false)
  }

  const deleteItem = async (id: string) => {
    if (!confirm('このアイテムを削除しますか？')) return
    await supabase.from('items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
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
        <h1 className="text-2xl font-bold">アイテム管理</h1>
        <button onClick={startNew} className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5">
          <Plus size={16} />追加
        </button>
      </div>

      {/* ジャンル管理 */}
      <div className="glass rounded-2xl p-5 mb-6">
        <h2 className="font-semibold text-sm flex items-center gap-1.5 mb-3">
          <Tag size={14} />
          ジャンル管理
        </h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {categories.length === 0 && (
            <p className="text-xs text-[var(--color-text-muted)]">ジャンルはまだありません</p>
          )}
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              {editingCat?.id === cat.id ? (
                <>
                  <input
                    value={editCatName}
                    onChange={e => setEditCatName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveCategory()}
                    className="w-24 bg-transparent text-sm focus:outline-none"
                    autoFocus
                  />
                  <button onClick={saveCategory} className="p-0.5 hover:text-emerald-400 transition-colors">
                    <Check size={12} />
                  </button>
                  <button onClick={() => setEditingCat(null)} className="p-0.5 hover:text-[var(--color-text)] transition-colors text-[var(--color-text-muted)]">
                    <X size={12} />
                  </button>
                </>
              ) : (
                <>
                  <span>{cat.name}</span>
                  <button
                    onClick={() => { setEditingCat(cat); setEditCatName(cat.name) }}
                    className="p-0.5 ml-1 hover:text-[var(--color-text)] transition-colors text-[var(--color-text-muted)]"
                  >
                    <Edit2 size={11} />
                  </button>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="p-0.5 hover:text-red-400 transition-colors text-[var(--color-text-muted)]"
                  >
                    <Trash2 size={11} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
            placeholder="新しいジャンル名"
            className="flex-1 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
          />
          <button
            onClick={addCategory}
            disabled={addingCat || !newCatName.trim()}
            className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5 disabled:opacity-60"
          >
            {addingCat ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            追加
          </button>
        </div>
      </div>

      {/* アイテム編集フォーム */}
      {(isNew || editing) && (
        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="font-semibold mb-4">{isNew ? '新しいアイテムを追加' : 'アイテムを編集'}</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">名前 *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="例：バラの花束"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">価格（ポイント）</label>
                <input
                  type="number"
                  value={form.price_points}
                  onChange={e => setForm(f => ({ ...f, price_points: parseInt(e.target.value) || 0 }))}
                  min={1}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">ジャンル</label>
              <select
                value={form.category_id}
                onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="">なし</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">説明文</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-[var(--color-primary)]"
                placeholder="例：気持ちを伝える赤いバラの花束"
              />
            </div>

            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">アイテム画像</label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-[var(--color-border)] flex-shrink-0 bg-[var(--color-surface-2)] flex items-center justify-center">
                  {form.image_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
                    : <Gift size={20} className="text-[var(--color-text-muted)]" />
                  }
                </div>
                <div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="btn-ghost px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-60"
                  >
                    {uploading
                      ? <><Loader2 size={14} className="animate-spin" />アップロード中...</>
                      : <><Upload size={14} />画像をアップロード</>
                    }
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">表示順</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div className="flex items-center gap-2 mt-5">
                <input
                  type="checkbox"
                  id="item_active"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="item_active" className="text-sm">公開中</label>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button
              onClick={save}
              disabled={saving || !form.name.trim()}
              className="btn-primary px-5 py-2.5 text-sm flex items-center gap-1.5 disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              保存
            </button>
            <button onClick={cancel} className="btn-ghost px-5 py-2.5 text-sm flex items-center gap-1.5">
              <X size={14} />キャンセル
            </button>
          </div>
        </div>
      )}

      {/* アイテム一覧 */}
      {items.length === 0 && !isNew ? (
        <div className="text-center py-16 text-[var(--color-text-muted)]">
          <Gift size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">アイテムはまだありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.id} className="glass rounded-2xl overflow-hidden">
              <div className="relative" style={{ aspectRatio: '1' }}>
                {item.image_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  : (
                    <div className="w-full h-full flex items-center justify-center bg-[var(--color-surface-2)]">
                      <Gift size={32} className="text-[var(--color-text-muted)] opacity-40" />
                    </div>
                  )
                }
                <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full ${item.is_active ? 'bg-emerald-900/70 text-emerald-400' : 'bg-gray-800/80 text-gray-400'}`}>
                  {item.is_active ? '公開' : '非公開'}
                </span>
              </div>
              <div className="p-3">
                {item.category && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full inline-block mb-1"
                    style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                    {item.category.name}
                  </span>
                )}
                <p className="font-semibold text-sm">{item.name}</p>
                {item.description && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">{item.description}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>
                    {item.price_points}pt
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(item)}
                      className="p-1.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-1.5 rounded-lg hover:bg-red-900/30 transition-colors text-[var(--color-text-muted)] hover:text-red-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
