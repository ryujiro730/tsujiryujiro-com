'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Plus, Trash2, Image as ImageIcon, X, Upload, Play, CheckSquare, Square, FolderInput } from 'lucide-react'
import { compressImage, heicToBlob, isHeic } from '@/lib/compress-image'

type Character = { id: string; name: string }
type Photo = {
  id: string
  character_id: string | null
  category: string | null
  title: string
  image_url: string
  media_type: 'image' | 'video'
  is_active: boolean
  sort_order: number
  created_at: string
  characters: { id: string; name: string } | null
}

const CATEGORIES = [
  { key: 'food',    label: '食べ物' },
  { key: 'scenery', label: '風景' },
  { key: 'hobby',   label: '趣味' },
  { key: 'other',   label: 'その他' },
] as const

function categoryLabel(key: string | null): string {
  return CATEGORIES.find(c => c.key === key)?.label ?? '汎用'
}

export default function OpegraPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [previewMedia, setPreviewMedia] = useState<Photo | null>(null)

  // 選択モード
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null)
  const [moveCharId, setMoveCharId] = useState('__generic__')
  const [moveCategory, setMoveCategory] = useState('')
  const [moving, setMoving] = useState(false)

  // Upload form state
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadCharId, setUploadCharId] = useState<string>('__generic__')
  const [uploadCategory, setUploadCategory] = useState<string>('')
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null)
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    const [photosRes, charsRes] = await Promise.all([
      fetch('/api/admin/opegra'),
      supabase.from('characters').select('id, name').order('name'),
    ])
    const { photos: p } = await photosRes.json()
    setPhotos(p ?? [])
    setCharacters((charsRes.data ?? []) as Character[])
    setLoading(false)
  }

  const addFiles = (files: File[]) => {
    if (!files.length) return
    setUploadFiles(prev => [...prev, ...files])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []))
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.type.startsWith('image/') || f.type.startsWith('video/') ||
      /\.(heic|heif)$/i.test(f.name)
    )
    addFiles(files)
  }

  const removeUploadFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index))
  }

  const openUpload = () => {
    setUploadFiles([])
    setUploadCharId('__generic__')
    setUploadCategory('')
    setUploadProgress(null)
    setUploadErrors([])
    setShowUpload(true)
  }

  const closeUpload = () => {
    setUploadFiles([])
    setUploadProgress(null)
    setUploadErrors([])
    setShowUpload(false)
  }

  const uploadOneFile = async (file: File): Promise<void> => {
    const isVideo = file.type.startsWith('video/')
    let uploadBlob: Blob
    let contentType: string
    let ext: string

    if (isVideo) {
      uploadBlob = file
      contentType = file.type || 'video/mp4'
      ext = file.name.split('.').pop() ?? 'mp4'
    } else {
      const source = isHeic(file) ? await heicToBlob(file) : file
      const { blob: compressed } = await compressImage(source instanceof File ? source : new File([source], file.name, { type: source.type }))
      uploadBlob = compressed
      contentType = 'image/webp'
      ext = 'webp'
    }

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const folder = isVideo ? 'opegra-videos' : 'opegra'
    const path = `${folder}/${filename}`

    const { error: storageErr } = await supabase.storage
      .from('chat-images')
      .upload(path, uploadBlob, { upsert: false, contentType })
    if (storageErr) throw new Error(storageErr.message)

    const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(path)
    const isGeneric = uploadCharId === '__generic__'

    const res = await fetch('/api/admin/opegra', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        characterId: isGeneric ? null : uploadCharId,
        title: file.name.replace(/\.[^.]+$/, ''),
        imageUrl: urlData.publicUrl,
        mediaType: isVideo ? 'video' : 'image',
        category: isGeneric ? (uploadCategory || null) : null,
      }),
    })
    if (!res.ok) throw new Error('登録に失敗しました')

    const { photo } = await res.json()
    setPhotos(prev => [photo, ...prev])
  }

  const handleUpload = async () => {
    if (!uploadFiles.length) return
    setUploadProgress({ done: 0, total: uploadFiles.length })

    const errors: string[] = []
    for (let i = 0; i < uploadFiles.length; i++) {
      try {
        await uploadOneFile(uploadFiles[i])
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error(`[opegra upload] ${uploadFiles[i].name}:`, e)
        errors.push(`${uploadFiles[i].name}: ${msg}`)
      }
      setUploadProgress({ done: i + 1, total: uploadFiles.length })
    }

    if (errors.length) {
      setUploadErrors(errors)
    } else {
      closeUpload()
    }
  }

  const deletePhoto = async (photoId: string) => {
    if (!confirm('このメディアを削除しますか？送信済み履歴も消えます。')) return
    const res = await fetch(`/api/admin/opegra/${photoId}`, { method: 'DELETE' })
    if (!res.ok) { alert('削除に失敗しました'); return }
    setPhotos(prev => prev.filter(p => p.id !== photoId))
  }

  const toggleSelect = (id: string, index: number, shiftKey: boolean) => {
    if (shiftKey && lastClickedIndex !== null) {
      const lo = Math.min(lastClickedIndex, index)
      const hi = Math.max(lastClickedIndex, index)
      const rangeIds = filteredPhotos.slice(lo, hi + 1).map(p => p.id)
      setSelected(prev => {
        const next = new Set(prev)
        rangeIds.forEach(rid => next.add(rid))
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
      setLastClickedIndex(index)
    }
  }

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelected(new Set())
    setLastClickedIndex(null)
    setMoveCharId('__generic__')
    setMoveCategory('')
  }

  const selectAll = () => {
    setSelected(new Set(filteredPhotos.map(p => p.id)))
  }

  const handleBulkMove = async () => {
    if (selected.size === 0) return
    setMoving(true)
    const isGeneric = moveCharId === '__generic__'
    const res = await fetch('/api/admin/opegra', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photoIds: [...selected],
        characterId: isGeneric ? null : moveCharId,
        category: isGeneric ? (moveCategory || null) : null,
      }),
    })
    if (!res.ok) {
      alert('移動に失敗しました')
      setMoving(false)
      return
    }
    // ローカル状態を更新
    const newCharId = isGeneric ? null : moveCharId
    const newCategory = isGeneric ? (moveCategory || null) : null
    const newChar = characters.find(c => c.id === moveCharId) ?? null
    setPhotos(prev => prev.map(p =>
      selected.has(p.id)
        ? { ...p, character_id: newCharId, category: newCategory, characters: newChar ? { id: newChar.id, name: newChar.name } : null }
        : p
    ))
    exitSelectMode()
    setMoving(false)
  }

  const CATEGORY_KEYS = CATEGORIES.map(c => c.key) as string[]

  const filteredPhotos = filter === null
    ? photos
    : filter === '__generic__'
    ? photos.filter(p => p.character_id === null && !p.category)
    : CATEGORY_KEYS.includes(filter)
    ? photos.filter(p => p.category === filter)
    : photos.filter(p => p.character_id === filter)

  const moveDestLabel = () => {
    if (moveCharId !== '__generic__') {
      return characters.find(c => c.id === moveCharId)?.name + '専用'
    }
    return moveCategory ? categoryLabel(moveCategory) : '汎用'
  }

  return (
    <div className="p-6 max-w-6xl mx-auto pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">オペグラ</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">スタッフがチャットで送る写真・動画ライブラリ</p>
        </div>
        <div className="flex gap-2">
          {!selectMode ? (
            <>
              <button
                onClick={() => setSelectMode(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-colors"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                <FolderInput size={15} /> まとめて移動
              </button>
              <button onClick={openUpload} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
                <Plus size={15} /> メディアを追加
              </button>
            </>
          ) : (
            <button onClick={exitSelectMode} className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
              <X size={15} /> キャンセル
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <FilterTab label="すべて" active={filter === null} onClick={() => setFilter(null)} />
        <FilterTab label="汎用" active={filter === '__generic__'} onClick={() => setFilter('__generic__')} />
        {CATEGORIES.map(cat => (
          <FilterTab key={cat.key} label={cat.label} active={filter === cat.key} onClick={() => setFilter(cat.key)} />
        ))}
        {characters.length > 0 && (
          <span className="text-[var(--color-border-warm)] text-xs self-center px-1">|</span>
        )}
        {characters.map(c => (
          <FilterTab key={c.id} label={c.name} active={filter === c.id} onClick={() => setFilter(c.id)} />
        ))}
      </div>

      {/* 選択モード：全選択バー */}
      {selectMode && (
        <div className="flex items-center gap-3 mb-4 px-3 py-2 rounded-xl text-sm" style={{ background: 'var(--color-primary-glow)', border: '1px solid var(--color-border-warm)' }}>
          <button onClick={selectAll} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-primary)' }}>
            <CheckSquare size={14} /> すべて選択
          </button>
          <span className="text-[var(--color-text-muted)] text-xs ml-auto">{selected.size}件選択中</span>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-[var(--color-primary)]" size={22} />
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div className="text-center py-20 text-[var(--color-text-muted)]">
          <ImageIcon size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">メディアがありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredPhotos.map((photo, index) => {
            const isSelected = selected.has(photo.id)
            return (
              <div
                key={photo.id}
                className="card overflow-hidden group relative"
                style={selectMode && isSelected ? { outline: '2.5px solid var(--color-primary)', outlineOffset: '1px' } : {}}
              >
                <div
                  className="aspect-[3/4] bg-[var(--color-surface-2)] overflow-hidden relative cursor-pointer"
                  onClick={e => selectMode ? toggleSelect(photo.id, index, e.shiftKey) : setPreviewMedia(photo)}
                >
                  {photo.media_type === 'video' ? (
                    <>
                      <video src={photo.image_url} className="w-full h-full object-cover" muted preload="metadata" />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-black/50 rounded-full w-10 h-10 flex items-center justify-center">
                          <Play size={18} className="text-white ml-0.5" />
                        </div>
                      </div>
                    </>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo.image_url} alt={photo.title || '写真'} className="w-full h-full object-cover" />
                  )}
                  {/* 選択チェックボックス */}
                  {selectMode && (
                    <div className="absolute top-2 left-2">
                      {isSelected
                        ? <CheckSquare size={20} className="text-white drop-shadow" style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))' }} />
                        : <Square size={20} className="text-white/70 drop-shadow" style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))' }} />
                      }
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate">{photo.title || '（タイトルなし）'}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {photo.characters?.name ?? categoryLabel(photo.category)}
                    {photo.media_type === 'video' && (
                      <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>動画</span>
                    )}
                  </p>
                </div>
                {!selectMode && (
                  <button
                    onClick={() => deletePhoto(photo.id)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 一括移動バー（選択モード時、固定フッター） */}
      {selectMode && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t px-4 py-4"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border-warm)' }}>
          <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex gap-2 flex-1">
              <div className="flex-1">
                <label className="text-[10px] text-[var(--color-text-muted)] mb-1 block">移動先：キャラクター</label>
                <select
                  value={moveCharId}
                  onChange={e => { setMoveCharId(e.target.value); setMoveCategory('') }}
                  className="input-warm w-full px-3 py-2 text-sm"
                >
                  <option value="__generic__">汎用</option>
                  {characters.map(c => (
                    <option key={c.id} value={c.id}>{c.name}専用</option>
                  ))}
                </select>
              </div>
              {moveCharId === '__generic__' && (
                <div className="flex-1">
                  <label className="text-[10px] text-[var(--color-text-muted)] mb-1 block">カテゴリ</label>
                  <select
                    value={moveCategory}
                    onChange={e => setMoveCategory(e.target.value)}
                    className="input-warm w-full px-3 py-2 text-sm"
                  >
                    <option value="">汎用（未分類）</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat.key} value={cat.key}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <button
              onClick={handleBulkMove}
              disabled={selected.size === 0 || moving}
              className="btn-primary px-5 py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap self-end"
            >
              {moving
                ? <><Loader2 size={15} className="animate-spin" /> 移動中…</>
                : <><FolderInput size={15} /> {selected.size}件を「{moveDestLabel()}」へ移動</>
              }
            </button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewMedia && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreviewMedia(null)}>
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewMedia(null)} className="absolute -top-10 right-0 text-white/70 hover:text-white">
              <X size={24} />
            </button>
            {previewMedia.media_type === 'video' ? (
              <video src={previewMedia.image_url} controls autoPlay className="w-full rounded-xl max-h-[80vh] object-contain bg-black" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewMedia.image_url} alt={previewMedia.title || '写真'} className="w-full rounded-xl max-h-[80vh] object-contain" />
            )}
            <p className="text-white/80 text-sm text-center mt-3">
              {previewMedia.title || '（タイトルなし）'}
              {previewMedia.characters && <span className="ml-2 opacity-60">— {previewMedia.characters.name}</span>}
            </p>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget && !uploadProgress) closeUpload() }}
        >
          <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-5 flex-shrink-0">
              <h2 className="font-bold text-lg">メディアを追加</h2>
              {!uploadProgress && (
                <button onClick={closeUpload} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                  <X size={20} />
                </button>
              )}
            </div>

            {/* ファイル選択エリア */}
            {!uploadProgress && (
              <div
                className="border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer mb-4 flex-shrink-0 py-6 transition-colors"
                style={{
                  background: dragOver ? 'var(--color-primary-glow)' : 'var(--color-surface-2)',
                  borderColor: dragOver ? 'var(--color-primary)' : 'var(--color-border-warm)',
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragEnter={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <div className="text-center pointer-events-none" style={{ color: dragOver ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                  <Upload size={28} className="mx-auto mb-2 opacity-60" />
                  <p className="text-sm">{dragOver ? 'ここにドロップ' : 'クリックまたはドラッグ&ドロップ'}</p>
                  <p className="text-xs mt-1 opacity-60">複数選択可 · 画像 / HEIC / MP4・MOV 対応</p>
                </div>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*,video/*,.heic,.heif" multiple className="hidden" onChange={handleFileSelect} />

            {/* 選択済みファイル一覧 */}
            {uploadFiles.length > 0 && !uploadProgress && (
              <div className="flex-1 overflow-y-auto mb-4 space-y-1.5 min-h-0">
                {uploadFiles.map((file, i) => {
                  const isVideo = file.type.startsWith('video/')
                  const previewUrl = !isVideo ? URL.createObjectURL(file) : null
                  return (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'var(--color-surface-2)' }}>
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--color-surface)' }}>
                        {isVideo
                          ? <Play size={16} className="text-[var(--color-text-muted)]" />
                          // eslint-disable-next-line @next/next/no-img-element
                          : <img src={previewUrl!} alt="" className="w-full h-full object-cover" onLoad={() => URL.revokeObjectURL(previewUrl!)} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{file.name}</p>
                        <p className="text-[11px] text-[var(--color-text-muted)]">{isVideo ? '動画' : '画像'} · {(file.size / 1024 / 1024).toFixed(1)}MB</p>
                      </div>
                      <button onClick={() => removeUploadFile(i)} className="text-[var(--color-text-muted)] hover:text-red-400 flex-shrink-0">
                        <X size={15} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* プログレス */}
            {uploadProgress && !uploadErrors.length && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 py-6">
                <Loader2 size={28} className="animate-spin text-[var(--color-primary)]" />
                <p className="text-sm font-medium">{uploadProgress.done} / {uploadProgress.total} 完了</p>
                <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: 'var(--color-surface-2)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%`, background: 'var(--color-primary)' }}
                  />
                </div>
              </div>
            )}

            {/* エラー一覧 */}
            {uploadErrors.length > 0 && (
              <div className="flex-1 flex flex-col gap-3 py-2">
                <p className="text-sm font-semibold text-red-400">
                  {uploadProgress!.total - uploadErrors.length}/{uploadProgress!.total} 件成功、{uploadErrors.length} 件失敗
                </p>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {uploadErrors.map((err, i) => (
                    <div key={i} className="px-3 py-2 rounded-lg text-xs font-mono break-all" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                      {err}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">詳細はブラウザのコンソール（F12）でも確認できます。</p>
                <button onClick={closeUpload} className="btn-primary py-2 text-sm">
                  閉じる
                </button>
              </div>
            )}

            {/* 設定 */}
            {!uploadProgress && (
              <div className="space-y-3 flex-shrink-0">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-[var(--color-text-muted)] mb-1 block">キャラクター</label>
                    <select
                      value={uploadCharId}
                      onChange={e => { setUploadCharId(e.target.value); setUploadCategory('') }}
                      className="input-warm w-full px-3 py-2 text-sm"
                    >
                      <option value="__generic__">汎用</option>
                      {characters.map(c => (
                        <option key={c.id} value={c.id}>{c.name}専用</option>
                      ))}
                    </select>
                  </div>
                  {uploadCharId === '__generic__' && (
                    <div className="flex-1">
                      <label className="text-xs text-[var(--color-text-muted)] mb-1 block">カテゴリ</label>
                      <select
                        value={uploadCategory}
                        onChange={e => setUploadCategory(e.target.value)}
                        className="input-warm w-full px-3 py-2 text-sm"
                      >
                        <option value="">汎用（未分類）</option>
                        {CATEGORIES.map(cat => (
                          <option key={cat.key} value={cat.key}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleUpload}
                  disabled={!uploadFiles.length}
                  className="btn-cta w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadFiles.length > 0 ? `${uploadFiles.length}件を追加する` : 'ファイルを選択してください'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FilterTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
      style={{
        background: active ? 'var(--color-primary)' : 'var(--color-surface-2)',
        color: active ? '#fff' : 'var(--color-text-muted)',
      }}
    >
      {label}
    </button>
  )
}
