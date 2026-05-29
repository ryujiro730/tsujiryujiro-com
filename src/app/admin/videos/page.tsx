'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit2, Trash2, Loader2, Check, X, Upload, Video } from 'lucide-react'
import { compressImage } from '@/lib/compress-image'

interface Character {
  id: string
  name: string
  avatar_url: string | null
}

interface VideoItem {
  id: string
  character_id: string | null
  title: string
  description: string | null
  price_points: number
  video_url: string
  thumbnail_url: string | null
  is_active: boolean
  sort_order: number
  character?: Character | null
}

interface FormState {
  title: string
  description: string
  price_points: number
  video_url: string
  thumbnail_url: string
  character_id: string
  is_active: boolean
  sort_order: number
}

const defaultForm: FormState = {
  title: '',
  description: '',
  price_points: 100,
  video_url: '',
  thumbnail_url: '',
  character_id: '',
  is_active: true,
  sort_order: 0,
}

async function generatePixelatedThumbnail(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    video.src = url
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.preload = 'metadata'

    const cleanup = () => URL.revokeObjectURL(url)

    video.onerror = () => { cleanup(); reject(new Error('動画の読み込みに失敗しました')) }

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(0.5, video.duration * 0.1)
    }

    video.onseeked = () => {
      try {
        const W = 320, H = 180
        const PIXEL = 16 // ピクセルブロックサイズ
        const smallW = Math.round(W / PIXEL)
        const smallH = Math.round(H / PIXEL)

        // Step1: 動画フレームを小さいcanvasに描画
        const smallCanvas = document.createElement('canvas')
        smallCanvas.width = smallW
        smallCanvas.height = smallH
        const smallCtx = smallCanvas.getContext('2d')!
        smallCtx.drawImage(video, 0, 0, smallW, smallH)

        // Step2: フルサイズcanvasにpixelated描画
        const canvas = document.createElement('canvas')
        canvas.width = W
        canvas.height = H
        const ctx = canvas.getContext('2d')!
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(smallCanvas, 0, 0, W, H)

        cleanup()
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error('Blob生成失敗')),
          'image/webp',
          0.85
        )
      } catch (e) {
        cleanup()
        reject(e)
      }
    }
  })
}

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<VideoItem | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingThumb, setUploadingThumb] = useState(false)
  const [form, setForm] = useState<FormState>(defaultForm)

  const videoInputRef = useRef<HTMLInputElement>(null)
  const thumbInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const [videosRes, { data: charsData }] = await Promise.all([
      fetch('/api/admin/videos'),
      supabase.from('characters').select('id, name, avatar_url').order('created_at'),
    ])
    if (videosRes.ok) {
      const { videos: vids } = await videosRes.json()
      setVideos(vids ?? [])
    }
    setCharacters(charsData ?? [])
    setLoading(false)
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const ext = file.name.split('.').pop() ?? 'mp4'
    const fileName = `video-items/${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('chat-images')
      .upload(fileName, file, { upsert: true, contentType: file.type })
    if (error) { alert('動画アップロード失敗: ' + error.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('chat-images').getPublicUrl(fileName)
    setForm(f => ({ ...f, video_url: publicUrl }))

    // サムネイル自動生成
    setUploadingThumb(true)
    try {
      const thumbBlob = await generatePixelatedThumbnail(file)
      const thumbName = `video-thumbnails/${Date.now()}.webp`
      const { error: thumbError } = await supabase.storage
        .from('chat-images')
        .upload(thumbName, thumbBlob, { upsert: true, contentType: 'image/webp' })
      if (!thumbError) {
        const { data: { publicUrl: thumbUrl } } = supabase.storage.from('chat-images').getPublicUrl(thumbName)
        setForm(f => ({ ...f, thumbnail_url: thumbUrl }))
      }
    } catch (thumbErr) {
      console.warn('サムネイル生成失敗:', thumbErr)
    }

    setUploading(false)
    setUploadingThumb(false)
  }

  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingThumb(true)
    const { blob: compressed } = await compressImage(file)
    const thumbName = `video-thumbnails/${Date.now()}.webp`
    const { error } = await supabase.storage
      .from('chat-images')
      .upload(thumbName, compressed, { upsert: true, contentType: 'image/webp' })
    if (error) { alert('サムネイルアップロード失敗: ' + error.message); setUploadingThumb(false); return }
    const { data: { publicUrl } } = supabase.storage.from('chat-images').getPublicUrl(thumbName)
    setForm(f => ({ ...f, thumbnail_url: publicUrl }))
    setUploadingThumb(false)
  }

  const startNew = () => {
    setIsNew(true); setEditing(null)
    setForm(defaultForm)
  }

  const startEdit = (video: VideoItem) => {
    setEditing(video); setIsNew(false)
    setForm({
      title: video.title,
      description: video.description ?? '',
      price_points: video.price_points,
      video_url: video.video_url,
      thumbnail_url: video.thumbnail_url ?? '',
      character_id: video.character_id ?? '',
      is_active: video.is_active,
      sort_order: video.sort_order,
    })
  }

  const cancel = () => { setEditing(null); setIsNew(false) }

  const save = async () => {
    if (!form.title.trim() || !form.video_url.trim()) {
      alert('タイトルと動画URLは必須です')
      return
    }
    setSaving(true)

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      price_points: form.price_points,
      video_url: form.video_url.trim(),
      thumbnail_url: form.thumbnail_url || null,
      character_id: form.character_id || null,
      is_active: form.is_active,
      sort_order: form.sort_order,
    }

    let res: Response
    if (isNew) {
      res = await fetch('/api/admin/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else if (editing) {
      res = await fetch(`/api/admin/videos/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      setSaving(false)
      return
    }

    const data = await res.json()
    if (!res.ok) { alert('保存失敗: ' + data.error); setSaving(false); return }

    if (isNew) {
      setVideos(prev => [...prev, data.video])
    } else {
      setVideos(prev => prev.map(v => v.id === data.video.id ? data.video : v))
    }
    setEditing(null); setIsNew(false); setSaving(false)
  }

  const deleteVideo = async (id: string) => {
    if (!confirm('この動画を削除しますか？')) return
    const res = await fetch(`/api/admin/videos/${id}`, { method: 'DELETE' })
    if (!res.ok) { alert('削除失敗'); return }
    setVideos(prev => prev.filter(v => v.id !== id))
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
        <h1 className="text-2xl font-bold">動画販売管理</h1>
        <button onClick={startNew} className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5">
          <Plus size={16} />新規追加
        </button>
      </div>

      {/* 追加/編集フォーム */}
      {(isNew || editing) && (
        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="font-semibold mb-4">{isNew ? '新しい動画を追加' : '動画を編集'}</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">タイトル *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="例：水着グラビア動画"
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
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">キャラクター</label>
              <select
                value={form.character_id}
                onChange={e => setForm(f => ({ ...f, character_id: e.target.value }))}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="">なし</option>
                {characters.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
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
                placeholder="動画の説明"
              />
            </div>

            {/* 動画アップロード */}
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">動画ファイル *</label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <input
                    value={form.video_url}
                    onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                    placeholder="動画URLを直接入力、またはアップロード"
                  />
                </div>
                <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={uploading}
                  className="btn-ghost px-4 py-2.5 text-sm flex items-center gap-2 flex-shrink-0 disabled:opacity-60"
                >
                  {uploading
                    ? <><Loader2 size={14} className="animate-spin" />アップロード中...</>
                    : <><Upload size={14} />動画を選択</>
                  }
                </button>
              </div>
              {form.video_url && (
                <p className="text-xs text-[var(--color-text-muted)] mt-1 truncate">{form.video_url}</p>
              )}
            </div>

            {/* サムネイル */}
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">
                サムネイル（動画アップロード時に自動生成されます）
              </label>
              <div className="flex items-center gap-3">
                <div className="w-20 h-12 rounded-xl overflow-hidden border border-[var(--color-border)] flex-shrink-0 bg-[var(--color-surface-2)] flex items-center justify-center">
                  {uploadingThumb ? (
                    <Loader2 size={16} className="animate-spin text-[var(--color-text-muted)]" />
                  ) : form.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.thumbnail_url} alt="thumbnail" className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
                  ) : (
                    <Video size={16} className="text-[var(--color-text-muted)]" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    value={form.thumbnail_url}
                    onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                    placeholder="サムネイルURL"
                  />
                </div>
                <input ref={thumbInputRef} type="file" accept="image/*" onChange={handleThumbUpload} className="hidden" />
                <button
                  type="button"
                  onClick={() => thumbInputRef.current?.click()}
                  disabled={uploadingThumb}
                  className="btn-ghost px-3 py-2.5 text-sm flex items-center gap-1.5 flex-shrink-0 disabled:opacity-60"
                >
                  {uploadingThumb ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                </button>
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
                  id="video_active"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="video_active" className="text-sm">公開中</label>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            <button
              onClick={save}
              disabled={saving || !form.title.trim() || !form.video_url.trim()}
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

      {/* 動画一覧 */}
      {videos.length === 0 && !isNew ? (
        <div className="text-center py-16 text-[var(--color-text-muted)]">
          <Video size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">動画はまだありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map((video) => (
            <div
              key={video.id}
              className="glass rounded-2xl overflow-hidden flex items-center gap-4 p-4"
            >
              {/* サムネイル */}
              <div className="w-28 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-[var(--color-surface-2)] flex items-center justify-center">
                {video.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <Video size={24} className="text-[var(--color-text-muted)] opacity-40" />
                )}
              </div>

              {/* 情報 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-sm truncate">{video.title}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${video.is_active ? 'bg-emerald-900/50 text-emerald-400' : 'bg-gray-800/50 text-gray-400'}`}>
                    {video.is_active ? '公開' : '非公開'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                  {video.character && (
                    <span className="flex items-center gap-1">
                      {video.character.avatar_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={video.character.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                      )}
                      {video.character.name}
                    </span>
                  )}
                  <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>{video.price_points}pt</span>
                  <span>順序: {video.sort_order}</span>
                </div>
                {video.description && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">{video.description}</p>
                )}
              </div>

              {/* 操作 */}
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => startEdit(video)}
                  className="p-2 rounded-xl hover:bg-[var(--color-surface-2)] transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => deleteVideo(video.id)}
                  className="p-2 rounded-xl hover:bg-red-900/30 transition-colors text-[var(--color-text-muted)] hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
