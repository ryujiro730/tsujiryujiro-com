'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Plus, Trash2, Image as ImageIcon, X, Upload, Play } from 'lucide-react'
import { compressImage } from '@/lib/compress-image'

type Character = { id: string; name: string }
type Photo = {
  id: string
  character_id: string | null
  title: string
  image_url: string
  media_type: 'image' | 'video'
  is_active: boolean
  sort_order: number
  created_at: string
  characters: { id: string; name: string } | null
}

export default function OpegraPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCharId, setFilterCharId] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadCharId, setUploadCharId] = useState<string>('__generic__')
  const [uploadMediaType, setUploadMediaType] = useState<'image' | 'video'>('image')
  const [uploading, setUploading] = useState(false)

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const isVideo = file.type.startsWith('video/')
    setUploadMediaType(isVideo ? 'video' : 'image')
    setUploadFile(file)
    const url = URL.createObjectURL(file)
    setUploadPreview(url)
  }

  const openUpload = () => {
    setUploadFile(null)
    setUploadPreview(null)
    setUploadTitle('')
    setUploadCharId('__generic__')
    setUploadMediaType('image')
    setShowUpload(true)
  }

  const closeUpload = () => {
    if (uploadPreview) URL.revokeObjectURL(uploadPreview)
    setUploadFile(null)
    setUploadPreview(null)
    setShowUpload(false)
  }

  const handleUpload = async () => {
    if (!uploadFile) return
    setUploading(true)

    let uploadBlob: Blob
    let contentType: string
    let ext: string

    if (uploadMediaType === 'video') {
      uploadBlob = uploadFile
      contentType = uploadFile.type || 'video/mp4'
      ext = uploadFile.name.split('.').pop() ?? 'mp4'
    } else {
      const { blob: compressed } = await compressImage(uploadFile)
      uploadBlob = compressed
      contentType = 'image/webp'
      ext = 'webp'
    }

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const folder = uploadMediaType === 'video' ? 'opegra-videos' : 'opegra'
    const path = `${folder}/${filename}`

    const { error: storageErr } = await supabase.storage
      .from('chat-images')
      .upload(path, uploadBlob, { upsert: false, contentType })

    if (storageErr) {
      alert('アップロード失敗: ' + storageErr.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(path)

    const res = await fetch('/api/admin/opegra', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        characterId: uploadCharId === '__generic__' ? null : uploadCharId,
        title: uploadTitle.trim(),
        imageUrl: urlData.publicUrl,
        mediaType: uploadMediaType,
      }),
    })

    if (!res.ok) {
      alert('登録に失敗しました')
      setUploading(false)
      return
    }

    const { photo } = await res.json()
    setPhotos(prev => [photo, ...prev])
    closeUpload()
    setUploading(false)
  }

  const deletePhoto = async (photoId: string) => {
    if (!confirm('このメディアを削除しますか？送信済み履歴も消えます。')) return
    const res = await fetch(`/api/admin/opegra/${photoId}`, { method: 'DELETE' })
    if (!res.ok) { alert('削除に失敗しました'); return }
    setPhotos(prev => prev.filter(p => p.id !== photoId))
  }

  const filteredPhotos = filterCharId === '__generic__'
    ? photos.filter(p => p.character_id === null)
    : filterCharId
    ? photos.filter(p => p.character_id === filterCharId)
    : photos

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">オペグラ</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">スタッフがチャットで送る写真・動画ライブラリ</p>
        </div>
        <button onClick={openUpload} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
          <Plus size={15} /> メディアを追加
        </button>
      </div>

      {/* Character filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <FilterTab label="すべて" active={filterCharId === null} onClick={() => setFilterCharId(null)} />
        <FilterTab label="汎用" active={filterCharId === '__generic__'} onClick={() => setFilterCharId('__generic__')} />
        {characters.map(c => (
          <FilterTab key={c.id} label={c.name} active={filterCharId === c.id} onClick={() => setFilterCharId(c.id)} />
        ))}
      </div>

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
          {filteredPhotos.map(photo => (
            <div key={photo.id} className="card overflow-hidden group relative">
              <div className="aspect-[3/4] bg-[var(--color-surface-2)] overflow-hidden relative">
                {photo.media_type === 'video' ? (
                  <>
                    <video
                      src={photo.image_url}
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                    />
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
              </div>
              <div className="p-2">
                <p className="text-xs font-medium truncate">{photo.title || '（タイトルなし）'}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {photo.characters?.name ?? '汎用'}
                  {photo.media_type === 'video' && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>動画</span>}
                </p>
              </div>
              <button
                onClick={() => deletePhoto(photo.id)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) closeUpload() }}
        >
          <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">メディアを追加</h2>
              <button onClick={closeUpload} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                <X size={20} />
              </button>
            </div>

            {/* Preview area */}
            <div
              className="aspect-[4/3] bg-[var(--color-surface-2)] border-2 border-dashed border-[var(--color-border-warm)] rounded-xl overflow-hidden flex items-center justify-center cursor-pointer mb-4 relative"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadPreview ? (
                uploadMediaType === 'video' ? (
                  <video src={uploadPreview} controls className="w-full h-full object-contain" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={uploadPreview} alt="preview" className="w-full h-full object-contain" />
                )
              ) : (
                <div className="text-center text-[var(--color-text-muted)]">
                  <Upload size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">クリックして写真・動画を選択</p>
                  <p className="text-xs mt-1 opacity-60">画像 / MP4・MOV 対応</p>
                </div>
              )}
              {uploadPreview && uploadMediaType === 'video' && (
                <div className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-semibold pointer-events-none"
                  style={{ background: 'rgba(99,102,241,0.85)', color: '#fff' }}>
                  動画
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">タイトル</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  placeholder="例：笑顔のショット"
                  className="input-warm w-full px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">キャラクター</label>
                <select
                  value={uploadCharId}
                  onChange={e => setUploadCharId(e.target.value)}
                  className="input-warm w-full px-3 py-2 text-sm"
                >
                  <option value="__generic__">汎用（どのキャラにも使用可）</option>
                  {characters.map(c => (
                    <option key={c.id} value={c.id}>{c.name}専用</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleUpload}
              disabled={!uploadFile || uploading}
              className="btn-cta w-full py-3 mt-5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? <><Loader2 size={16} className="animate-spin" /> アップロード中…</> : '追加する'}
            </button>
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
