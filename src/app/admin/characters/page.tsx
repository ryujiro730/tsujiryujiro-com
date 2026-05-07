'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit2, Trash2, Loader2, Check, X, Upload, Images, Megaphone, Calendar, Users, Send, Timer, ChevronDown, ChevronUp, Power, BookOpen } from 'lucide-react'
import type { Character, CharacterPhoto } from '@/types'

type Template = { id: string; title: string; content: string; sort_order: number }

async function compressImage(file: File, maxSize = 1200, quality = 0.8): Promise<Blob> {
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
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => resolve(blob ?? file), 'image/webp', quality)
    }
    img.src = url
  })
}

const STATUS_LABEL: Record<string, string> = {
  pending: '待機中',
  processing: '送信中',
  done: '完了',
  failed: '失敗',
}
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-900/40 text-yellow-400',
  processing: 'bg-blue-900/40 text-blue-400',
  done: 'bg-emerald-900/40 text-emerald-400',
  failed: 'bg-red-900/40 text-red-400',
}

export default function AdminCharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Character | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    age: 25,
    description: '',
    personality: '',
    system_prompt: '',
    welcome_message: '',
    avatar_url: '',
    is_active: true,
  })
  // テンプレート管理
  const [tmplCharId, setTmplCharId] = useState<string | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [tmplLoading, setTmplLoading] = useState(false)
  const [tmplForm, setTmplForm] = useState({ title: '', content: '' })
  const [tmplAdding, setTmplAdding] = useState(false)
  const [editingTmpl, setEditingTmpl] = useState<Record<string, { title: string; content: string }>>({})

  // フォト管理
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null)
  const [photos, setPhotos] = useState<CharacterPhoto[]>([])
  const [photosLoading, setPhotosLoading] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)

  // 自動同報
  const [autoCharId, setAutoCharId] = useState<string | null>(null)
  const [sequences, setSequences] = useState<any[]>([])
  const [autoLoading, setAutoLoading] = useState(false)
  const [newSeqName, setNewSeqName] = useState('')
  const [addingSeq, setAddingSeq] = useState(false)
  // ステップ追加フォーム: sequenceId -> { delayMinutes, message }
  const [stepForm, setStepForm] = useState<Record<string, { delayMinutes: string; message: string }>>({})
  // ステップ編集中: stepId -> { delayMinutes, message }
  const [editingStep, setEditingStep] = useState<Record<string, { delayMinutes: string; message: string }>>({})

  // 同報送信
  const [broadcastCharId, setBroadcastCharId] = useState<string | null>(null)
  const [broadcastJobs, setBroadcastJobs] = useState<any[]>([])
  const [bForm, setBForm] = useState({
    excludeWithConv: true,
    registeredFrom: '',
    registeredTo: '',
    chargedMin: '',
    chargedMax: '',
    gender: '',
    ageMin: '',
    ageMax: '',
    message: '',
    scheduledAt: '',
  })
  const [bPreview, setBPreview] = useState<{ count: number; samples: string[] } | null>(null)
  const [bPreviewing, setBPreviewing] = useState(false)
  const [bSending, setBSending] = useState(false)
  const [bSent, setBSent] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const compressed = await compressImage(file)
    const fileName = `${Date.now()}.webp`

    const { error } = await supabase.storage
      .from('avatars')
      .upload(fileName, compressed, { upsert: true, contentType: 'image/webp' })

    if (error) {
      alert('アップロード失敗: ' + error.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    setForm(f => ({ ...f, avatar_url: publicUrl }))
    setUploading(false)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0 || !selectedCharId) return

    setPhotoUploading(true)
    const newPhotos: CharacterPhoto[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const compressed = await compressImage(file)
      const fileName = `${Date.now()}-${i}.webp`

      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, compressed, { upsert: true, contentType: 'image/webp' })

      if (error) {
        alert(`${file.name} のアップロード失敗: ` + error.message)
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      const { data: newPhoto } = await supabase
        .from('character_photos')
        .insert({ character_id: selectedCharId, url: publicUrl, order_index: photos.length + newPhotos.length })
        .select()
        .single()

      if (newPhoto) newPhotos.push(newPhoto)
    }

    setPhotos(prev => [...prev, ...newPhotos])
    setPhotoUploading(false)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  const deletePhoto = async (photoId: string) => {
    await supabase.from('character_photos').delete().eq('id', photoId)
    setPhotos(prev => prev.filter(p => p.id !== photoId))
  }

  const openTemplates = async (charId: string) => {
    if (tmplCharId === charId) { setTmplCharId(null); setTemplates([]); return }
    setTmplCharId(charId)
    setTmplLoading(true)
    const { data } = await supabase.from('reply_templates').select('*').eq('character_id', charId).order('sort_order').order('created_at')
    setTemplates(data ?? [])
    setTmplLoading(false)
  }

  const addTemplate = async (charId: string) => {
    if (!tmplForm.title.trim() || !tmplForm.content.trim()) return
    setTmplAdding(true)
    const { data } = await supabase.from('reply_templates').insert({
      character_id: charId,
      title: tmplForm.title.trim(),
      content: tmplForm.content.trim(),
      sort_order: templates.length,
    }).select().single()
    if (data) setTemplates(prev => [...prev, data])
    setTmplForm({ title: '', content: '' })
    setTmplAdding(false)
  }

  const updateTemplate = async (tmplId: string) => {
    const f = editingTmpl[tmplId]
    if (!f?.title.trim() || !f?.content.trim()) return
    const { data } = await supabase.from('reply_templates').update({ title: f.title.trim(), content: f.content.trim() }).eq('id', tmplId).select().single()
    if (data) setTemplates(prev => prev.map(t => t.id === tmplId ? data : t))
    setEditingTmpl(prev => { const n = { ...prev }; delete n[tmplId]; return n })
  }

  const deleteTemplate = async (tmplId: string) => {
    if (!confirm('このテンプレートを削除しますか？')) return
    await supabase.from('reply_templates').delete().eq('id', tmplId)
    setTemplates(prev => prev.filter(t => t.id !== tmplId))
  }

  const openPhotos = async (charId: string) => {
    if (selectedCharId === charId) {
      setSelectedCharId(null)
      setPhotos([])
      return
    }
    setSelectedCharId(charId)
    setPhotosLoading(true)
    const { data } = await supabase
      .from('character_photos')
      .select('*')
      .eq('character_id', charId)
      .order('order_index')
    setPhotos(data || [])
    setPhotosLoading(false)
  }

  const openAutobroadcast = async (charId: string) => {
    if (autoCharId === charId) { setAutoCharId(null); setSequences([]); return }
    setAutoCharId(charId)
    setAutoLoading(true)
    const res = await fetch(`/api/admin/auto-broadcast?characterId=${charId}`)
    const data = await res.json()
    setSequences(Array.isArray(data) ? data : [])
    setAutoLoading(false)
  }

  const createSequence = async (charId: string) => {
    if (!newSeqName.trim()) return
    setAddingSeq(true)
    const res = await fetch('/api/admin/auto-broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId: charId, name: newSeqName.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setSequences(prev => [...prev, { ...data, auto_broadcast_steps: [] }])
      setNewSeqName('')
    }
    setAddingSeq(false)
  }

  const toggleSequence = async (seqId: string, isActive: boolean) => {
    const res = await fetch(`/api/admin/auto-broadcast/${seqId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive }),
    })
    if (res.ok) {
      setSequences(prev => prev.map(s => s.id === seqId ? { ...s, is_active: isActive } : s))
    }
  }

  const deleteSequence = async (seqId: string) => {
    if (!confirm('このシーケンスを削除しますか？')) return
    const res = await fetch(`/api/admin/auto-broadcast/${seqId}`, { method: 'DELETE' })
    if (res.ok) setSequences(prev => prev.filter(s => s.id !== seqId))
  }

  const addStep = async (seqId: string) => {
    const f = stepForm[seqId]
    if (!f?.delayMinutes || !f?.message?.trim()) return
    const res = await fetch(`/api/admin/auto-broadcast/${seqId}/steps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delay_minutes: parseInt(f.delayMinutes), message: f.message.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setSequences(prev => prev.map(s =>
        s.id === seqId ? { ...s, auto_broadcast_steps: [...(s.auto_broadcast_steps ?? []), data] } : s
      ))
      setStepForm(prev => ({ ...prev, [seqId]: { delayMinutes: '', message: '' } }))
    }
  }

  const updateStep = async (stepId: string, seqId: string) => {
    const f = editingStep[stepId]
    if (!f?.delayMinutes || !f?.message?.trim()) return
    const res = await fetch(`/api/admin/auto-broadcast/steps/${stepId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delay_minutes: parseInt(f.delayMinutes), message: f.message.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setSequences(prev => prev.map(s =>
        s.id === seqId
          ? { ...s, auto_broadcast_steps: s.auto_broadcast_steps.map((st: any) => st.id === stepId ? data : st) }
          : s
      ))
      setEditingStep(prev => { const n = { ...prev }; delete n[stepId]; return n })
    }
  }

  const deleteStep = async (stepId: string, seqId: string) => {
    if (!confirm('このステップを削除しますか？')) return
    const res = await fetch(`/api/admin/auto-broadcast/steps/${stepId}`, { method: 'DELETE' })
    if (res.ok) {
      setSequences(prev => prev.map(s =>
        s.id === seqId
          ? { ...s, auto_broadcast_steps: s.auto_broadcast_steps.filter((st: any) => st.id !== stepId) }
          : s
      ))
    }
  }

  const formatDelay = (minutes: number) => {
    if (minutes < 60) return `${minutes}分後`
    if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}時間後`
    return `${Math.floor(minutes / 60 / 24)}日後`
  }

  const openBroadcast = async (charId: string) => {
    if (broadcastCharId === charId) {
      setBroadcastCharId(null)
      setBroadcastJobs([])
      setBPreview(null)
      return
    }
    setBroadcastCharId(charId)
    setBPreview(null)
    setBSent(false)
    // 過去の同報ジョブを取得
    const { data } = await supabase.from('broadcast_jobs')
      .select('id, message, status, target_count, sent_count, scheduled_at, created_at')
      .eq('character_id', charId)
      .order('created_at', { ascending: false })
      .limit(10)
    setBroadcastJobs(data ?? [])
  }

  const previewBroadcast = async (charId: string) => {
    setBPreviewing(true)
    setBPreview(null)
    const params = new URLSearchParams({ characterId: charId, excludeWithConv: String(bForm.excludeWithConv) })
    if (bForm.registeredFrom) params.set('registeredFrom', bForm.registeredFrom)
    if (bForm.registeredTo) params.set('registeredTo', bForm.registeredTo)
    if (bForm.chargedMin) params.set('chargedMin', bForm.chargedMin)
    if (bForm.chargedMax) params.set('chargedMax', bForm.chargedMax)
    if (bForm.gender) params.set('gender', bForm.gender)
    if (bForm.ageMin) params.set('ageMin', bForm.ageMin)
    if (bForm.ageMax) params.set('ageMax', bForm.ageMax)
    const res = await fetch(`/api/admin/broadcast/preview?${params}`)
    const data = await res.json()
    setBPreview(data)
    setBPreviewing(false)
  }

  const sendBroadcast = async (charId: string) => {
    if (!bForm.message.trim()) return
    if (!confirm(`${bPreview?.count ?? '?'}人に送信します。よろしいですか？`)) return
    setBSending(true)
    const res = await fetch('/api/admin/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        characterId: charId,
        message: bForm.message,
        scheduledAt: bForm.scheduledAt || null,
        filters: {
          excludeWithConv: bForm.excludeWithConv,
          registeredFrom: bForm.registeredFrom || null,
          registeredTo: bForm.registeredTo || null,
          chargedMin: bForm.chargedMin ? parseInt(bForm.chargedMin) : null,
          chargedMax: bForm.chargedMax ? parseInt(bForm.chargedMax) : null,
          gender: bForm.gender || null,
          ageMin: bForm.ageMin ? parseInt(bForm.ageMin) : null,
          ageMax: bForm.ageMax ? parseInt(bForm.ageMax) : null,
        },
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      alert('送信失敗: ' + data.error)
    } else {
      setBSent(true)
      setBForm(f => ({ ...f, message: '', scheduledAt: '' }))
      setBPreview(null)
      // ジョブリストを再取得
      await openBroadcast(charId)
    }
    setBSending(false)
  }

  const startEdit = (char: Character) => {
    setEditing(char)
    setIsNew(false)
    setSelectedCharId(null)
    setPhotos([])
    setForm({
      name: char.name,
      age: char.age,
      description: char.description,
      personality: char.personality,
      system_prompt: char.system_prompt ?? '',
      welcome_message: char.welcome_message ?? '',
      avatar_url: char.avatar_url,
      is_active: char.is_active,
    })
  }

  const startNew = () => {
    setEditing(null)
    setIsNew(true)
    setSelectedCharId(null)
    setPhotos([])
    setForm({ name: '', age: 25, description: '', personality: '', system_prompt: '', welcome_message: '', avatar_url: '', is_active: true })
  }

  const cancel = () => {
    setEditing(null)
    setIsNew(false)
  }

  const save = async () => {
    setSaving(true)
    if (isNew) {
      const { data, error } = await supabase.from('characters').insert({
        ...form,
        reply_cost_points: 1,
      }).select().single()
      if (error) { alert('保存失敗: ' + error.message); setSaving(false); return }
      if (data) setCharacters(prev => [...prev, data])
    } else if (editing) {
      const { data, error } = await supabase.from('characters')
        .update(form)
        .eq('id', editing.id)
        .select().single()
      if (error) { alert('保存失敗: ' + error.message); setSaving(false); return }
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
    if (selectedCharId === id) { setSelectedCharId(null); setPhotos([]) }
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

      {/* フォーム */}
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

            {/* アバター画像 */}
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">アバター画像（メイン）</label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full overflow-hidden border border-[var(--color-border)] flex-shrink-0 bg-[var(--color-surface-2)] flex items-center justify-center">
                  {form.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.avatar_url} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[var(--color-text-muted)] text-xs">未設定</span>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
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
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">AIシステムプロンプト（追加指示）</label>
              <textarea
                value={form.system_prompt}
                onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))}
                rows={4}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-[var(--color-primary)]"
                placeholder="例：語尾に「〜だよ」を使ってください。絵文字を積極的に使ってください。"
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-1">キャラクター名・年齢・プロフィール・性格は自動でAIに伝えられます。ここには追加の行動指示を書いてください。</p>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">ウェルカムメッセージ（初回会話時に自動送信）</label>
              <textarea
                value={form.welcome_message}
                onChange={e => setForm(f => ({ ...f, welcome_message: e.target.value }))}
                rows={3}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-[var(--color-primary)]"
                placeholder="例：はじめまして！さくらだよ〜♪ 気軽に話しかけてね！"
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-1">ユーザーがこのキャラを選んで会話を開始した直後に自動で送られます。空欄の場合は送信されません。</p>
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
          <div key={char.id}>
            <div className="glass rounded-2xl px-5 py-4 flex items-center gap-4">
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
                  onClick={() => openTemplates(char.id)}
                  className={`p-2 rounded-lg transition-colors ${tmplCharId === char.id ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                  title="返信テンプレート"
                >
                  <BookOpen size={16} />
                </button>
                <button
                  onClick={() => openPhotos(char.id)}
                  className={`p-2 rounded-lg transition-colors ${selectedCharId === char.id ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                  title="フォト管理"
                >
                  <Images size={16} />
                </button>
                <button
                  onClick={() => openBroadcast(char.id)}
                  className={`p-2 rounded-lg transition-colors ${broadcastCharId === char.id ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                  title="同報送信"
                >
                  <Megaphone size={16} />
                </button>
                <button
                  onClick={() => openAutobroadcast(char.id)}
                  className={`p-2 rounded-lg transition-colors ${autoCharId === char.id ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                  title="自動同報"
                >
                  <Timer size={16} />
                </button>
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

            {/* フォト管理パネル */}
            {selectedCharId === char.id && (
              <div className="mt-1 glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5">
                    <Images size={14} />
                    {char.name}のフォト
                  </h3>
                  <div>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photoUploading}
                      className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {photoUploading
                        ? <><Loader2 size={12} className="animate-spin" />追加中...</>
                        : <><Upload size={12} />写真を追加</>
                      }
                    </button>
                  </div>
                </div>

                {photosLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" />
                  </div>
                ) : photos.length === 0 ? (
                  <p className="text-[var(--color-text-muted)] text-xs text-center py-4">
                    フォトはまだありません。写真を追加してください。
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {photos.map((photo) => (
                      <div key={photo.id} className="relative group rounded-xl overflow-hidden" style={{ aspectRatio: '1' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => deletePhoto(photo.id)}
                          className="absolute top-1 right-1 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: 'rgba(0,0,0,0.6)' }}
                        >
                          <Trash2 size={12} className="text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* テンプレートパネル */}
            {tmplCharId === char.id && (
              <div className="mt-1 glass rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <BookOpen size={14} />
                  {char.name}の返信テンプレート
                </h3>

                {tmplLoading ? (
                  <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" /></div>
                ) : (
                  <>
                    {templates.length === 0 && (
                      <p className="text-xs text-[var(--color-text-muted)] text-center py-2">テンプレートがまだありません</p>
                    )}

                    {templates.map((tmpl) => (
                      <div key={tmpl.id} className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-3 space-y-2">
                        {editingTmpl[tmpl.id] ? (
                          <div className="space-y-2">
                            <input
                              value={editingTmpl[tmpl.id].title}
                              onChange={e => setEditingTmpl(prev => ({ ...prev, [tmpl.id]: { ...prev[tmpl.id], title: e.target.value } }))}
                              placeholder="タイトル（例：1通目）"
                              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                            />
                            <textarea
                              value={editingTmpl[tmpl.id].content}
                              onChange={e => setEditingTmpl(prev => ({ ...prev, [tmpl.id]: { ...prev[tmpl.id], content: e.target.value } }))}
                              rows={4}
                              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs resize-none focus:outline-none focus:border-[var(--color-primary)]"
                            />
                            <div className="flex gap-2">
                              <button onClick={() => updateTemplate(tmpl.id)} className="btn-primary px-3 py-1 text-xs flex items-center gap-1"><Check size={11} />保存</button>
                              <button onClick={() => setEditingTmpl(prev => { const n = { ...prev }; delete n[tmpl.id]; return n })} className="btn-ghost px-3 py-1 text-xs">キャンセル</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-primary)' }}>{tmpl.title}</p>
                              <p className="text-xs text-[var(--color-text)] whitespace-pre-wrap line-clamp-3">{tmpl.content}</p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={() => setEditingTmpl(prev => ({ ...prev, [tmpl.id]: { title: tmpl.title, content: tmpl.content } }))}
                                className="p-1 rounded hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                              ><Edit2 size={11} /></button>
                              <button
                                onClick={() => deleteTemplate(tmpl.id)}
                                className="p-1 rounded hover:bg-red-900/30 text-[var(--color-text-muted)] hover:text-red-400"
                              ><Trash2 size={11} /></button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* 追加フォーム */}
                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-medium text-[var(--color-text-muted)]">テンプレートを追加</p>
                      <input
                        value={tmplForm.title}
                        onChange={e => setTmplForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="タイトル（例：1通目、フォローアップ）"
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                      />
                      <textarea
                        value={tmplForm.content}
                        onChange={e => setTmplForm(f => ({ ...f, content: e.target.value }))}
                        rows={4}
                        placeholder="テンプレート本文…"
                        className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:border-[var(--color-primary)]"
                      />
                      <button
                        onClick={() => addTemplate(char.id)}
                        disabled={tmplAdding || !tmplForm.title.trim() || !tmplForm.content.trim()}
                        className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1 disabled:opacity-60"
                      >
                        {tmplAdding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                        追加
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 自動同報パネル */}
            {autoCharId === char.id && (
              <div className="mt-1 glass rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Timer size={14} />
                  {char.name}の自動同報シーケンス
                </h3>

                {autoLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" />
                  </div>
                ) : (
                  <>
                    {sequences.length === 0 && (
                      <p className="text-xs text-[var(--color-text-muted)] text-center py-2">シーケンスがまだありません</p>
                    )}

                    {sequences.map((seq) => (
                      <div key={seq.id} className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-4 space-y-3">
                        {/* シーケンスヘッダー */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleSequence(seq.id, !seq.is_active)}
                            className={`p-1 rounded-md transition-colors ${seq.is_active ? 'text-emerald-400' : 'text-[var(--color-text-muted)]'}`}
                            title={seq.is_active ? 'ON（クリックでOFF）' : 'OFF（クリックでON）'}
                          >
                            <Power size={14} />
                          </button>
                          <span className="font-medium text-sm flex-1">{seq.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${seq.is_active ? 'bg-emerald-900/40 text-emerald-400' : 'bg-gray-800 text-gray-500'}`}>
                            {seq.is_active ? 'ON' : 'OFF'}
                          </span>
                          <button
                            onClick={() => deleteSequence(seq.id)}
                            className="p-1 rounded-md hover:bg-red-900/30 text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* ステップ一覧 */}
                        {(seq.auto_broadcast_steps ?? []).length === 0 && (
                          <p className="text-xs text-[var(--color-text-muted)] pl-2">ステップなし</p>
                        )}
                        {(seq.auto_broadcast_steps ?? []).map((step: any, idx: number) => (
                          <div key={step.id} className="bg-[var(--color-surface)] rounded-lg px-3 py-2.5 space-y-1.5">
                            {editingStep[step.id] ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-[var(--color-text-muted)] w-20 flex-shrink-0">遅延（分）</span>
                                  <input
                                    type="number"
                                    value={editingStep[step.id].delayMinutes}
                                    onChange={e => setEditingStep(prev => ({ ...prev, [step.id]: { ...prev[step.id], delayMinutes: e.target.value } }))}
                                    className="w-24 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                                    min={1}
                                  />
                                </div>
                                <textarea
                                  value={editingStep[step.id].message}
                                  onChange={e => setEditingStep(prev => ({ ...prev, [step.id]: { ...prev[step.id], message: e.target.value } }))}
                                  rows={3}
                                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs resize-none focus:outline-none focus:border-[var(--color-primary)]"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => updateStep(step.id, seq.id)}
                                    className="btn-primary px-3 py-1 text-xs flex items-center gap-1"
                                  >
                                    <Check size={11} />保存
                                  </button>
                                  <button
                                    onClick={() => setEditingStep(prev => { const n = { ...prev }; delete n[step.id]; return n })}
                                    className="btn-ghost px-3 py-1 text-xs"
                                  >
                                    キャンセル
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2">
                                <span className="text-xs text-[var(--color-text-muted)] w-6 flex-shrink-0 pt-0.5">{idx + 1}.</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-[var(--color-primary)] font-medium mb-0.5">登録後 {formatDelay(step.delay_minutes)}</p>
                                  <p className="text-xs text-[var(--color-text)] line-clamp-2">{step.message}</p>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => setEditingStep(prev => ({ ...prev, [step.id]: { delayMinutes: String(step.delay_minutes), message: step.message } }))}
                                    className="p-1 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                                  >
                                    <Edit2 size={11} />
                                  </button>
                                  <button
                                    onClick={() => deleteStep(step.id, seq.id)}
                                    className="p-1 rounded hover:bg-red-900/30 text-[var(--color-text-muted)] hover:text-red-400"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}

                        {/* ステップ追加フォーム */}
                        <div className="space-y-2 pt-1">
                          <p className="text-xs font-medium text-[var(--color-text-muted)]">ステップを追加</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">登録後</span>
                            <input
                              type="number"
                              value={stepForm[seq.id]?.delayMinutes ?? ''}
                              onChange={e => setStepForm(prev => ({ ...prev, [seq.id]: { ...prev[seq.id], delayMinutes: e.target.value, message: prev[seq.id]?.message ?? '' } }))}
                              placeholder="30"
                              min={1}
                              className="w-20 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                            />
                            <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">分後</span>
                          </div>
                          <textarea
                            value={stepForm[seq.id]?.message ?? ''}
                            onChange={e => setStepForm(prev => ({ ...prev, [seq.id]: { ...prev[seq.id], message: e.target.value, delayMinutes: prev[seq.id]?.delayMinutes ?? '' } }))}
                            rows={3}
                            placeholder="自動送信するメッセージ..."
                            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs resize-none focus:outline-none focus:border-[var(--color-primary)]"
                          />
                          <button
                            onClick={() => addStep(seq.id)}
                            disabled={!stepForm[seq.id]?.delayMinutes || !stepForm[seq.id]?.message?.trim()}
                            className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1 disabled:opacity-60"
                          >
                            <Plus size={11} />ステップを追加
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* 新しいシーケンスを追加 */}
                    <div className="flex gap-2">
                      <input
                        value={newSeqName}
                        onChange={e => setNewSeqName(e.target.value)}
                        placeholder="シーケンス名（例：登録直後フォロー）"
                        className="flex-1 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                        onKeyDown={e => e.key === 'Enter' && createSequence(char.id)}
                      />
                      <button
                        onClick={() => createSequence(char.id)}
                        disabled={addingSeq || !newSeqName.trim()}
                        className="btn-primary px-3 py-2 text-xs flex items-center gap-1 disabled:opacity-60"
                      >
                        {addingSeq ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                        作成
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 同報送信パネル */}
            {broadcastCharId === char.id && (
              <div className="mt-1 glass rounded-2xl p-5 space-y-5">
                {/* ヘッダー */}
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Megaphone size={14} />
                  {char.name}への同報送信
                </h3>

                {/* フィルター設定 */}
                <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-4 space-y-4">
                  <p className="text-xs font-medium text-[var(--color-text-muted)] flex items-center gap-1.5">
                    <Users size={12} />
                    送信対象フィルター
                  </p>

                  {/* やり取り除外 */}
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bForm.excludeWithConv}
                      onChange={e => setBForm(f => ({ ...f, excludeWithConv: e.target.checked }))}
                      className="rounded"
                    />
                    やり取りがあるユーザーを除外
                  </label>

                  {/* 登録日 */}
                  <div>
                    <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">登録日</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={bForm.registeredFrom}
                        onChange={e => setBForm(f => ({ ...f, registeredFrom: e.target.value }))}
                        className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                      />
                      <span className="text-xs text-[var(--color-text-muted)]">〜</span>
                      <input
                        type="date"
                        value={bForm.registeredTo}
                        onChange={e => setBForm(f => ({ ...f, registeredTo: e.target.value }))}
                        className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                  </div>

                  {/* 総入金額 */}
                  <div>
                    <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">総入金額（円）</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={bForm.chargedMin}
                        onChange={e => setBForm(f => ({ ...f, chargedMin: e.target.value }))}
                        placeholder="下限"
                        className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                      />
                      <span className="text-xs text-[var(--color-text-muted)]">〜</span>
                      <input
                        type="number"
                        value={bForm.chargedMax}
                        onChange={e => setBForm(f => ({ ...f, chargedMax: e.target.value }))}
                        placeholder="上限"
                        className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                  </div>

                  {/* 性別 */}
                  <div>
                    <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">性別</label>
                    <select
                      value={bForm.gender}
                      onChange={e => setBForm(f => ({ ...f, gender: e.target.value }))}
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                    >
                      <option value="">すべて</option>
                      <option value="male">男性</option>
                      <option value="female">女性</option>
                      <option value="other">その他</option>
                    </select>
                  </div>

                  {/* 年齢 */}
                  <div>
                    <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">年齢</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={bForm.ageMin}
                        onChange={e => setBForm(f => ({ ...f, ageMin: e.target.value }))}
                        placeholder="下限"
                        className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                      />
                      <span className="text-xs text-[var(--color-text-muted)]">〜</span>
                      <input
                        type="number"
                        value={bForm.ageMax}
                        onChange={e => setBForm(f => ({ ...f, ageMax: e.target.value }))}
                        placeholder="上限"
                        className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                  </div>

                  {/* プレビューボタン */}
                  <button
                    onClick={() => previewBroadcast(char.id)}
                    disabled={bPreviewing}
                    className="btn-ghost px-4 py-2 text-sm flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {bPreviewing
                      ? <><Loader2 size={14} className="animate-spin" />確認中...</>
                      : <><Users size={14} />対象ユーザーを確認</>
                    }
                  </button>

                  {/* プレビュー結果 */}
                  {bPreview && (
                    <div className="bg-[var(--color-surface)] rounded-lg px-4 py-3 text-sm">
                      <p className="font-semibold text-[var(--color-text)]">
                        対象: <span className="text-[var(--color-primary)]">{bPreview.count}人</span>
                      </p>
                      {bPreview.samples.length > 0 && (
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">
                          例: {bPreview.samples.join('、')}
                          {bPreview.count > bPreview.samples.length && ` …他${bPreview.count - bPreview.samples.length}人`}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* メッセージ入力 */}
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">送信メッセージ</label>
                  <textarea
                    value={bForm.message}
                    onChange={e => setBForm(f => ({ ...f, message: e.target.value }))}
                    rows={4}
                    placeholder={`${char.name}からのメッセージを入力...`}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                {/* 送信日時（スケジュール） */}
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1.5 flex items-center gap-1">
                    <Calendar size={11} />
                    送信日時（空欄なら即時送信）
                  </label>
                  <input
                    type="datetime-local"
                    value={bForm.scheduledAt}
                    onChange={e => setBForm(f => ({ ...f, scheduledAt: e.target.value }))}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                {/* 送信ボタン */}
                {bSent && (
                  <div className="flex items-center gap-2 text-sm text-emerald-400">
                    <Check size={14} />
                    送信が開始されました
                  </div>
                )}
                <button
                  onClick={() => sendBroadcast(char.id)}
                  disabled={bSending || !bForm.message.trim() || !bPreview}
                  className="btn-primary px-5 py-2.5 text-sm flex items-center gap-1.5 disabled:opacity-60"
                >
                  {bSending
                    ? <><Loader2 size={14} className="animate-spin" />送信中...</>
                    : <><Send size={14} />同報送信</>
                  }
                </button>

                {/* 同報履歴 */}
                {broadcastJobs.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">過去の同報履歴</p>
                    <div className="space-y-2">
                      {broadcastJobs.map((job) => (
                        <div
                          key={job.id}
                          className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-xs"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLOR[job.status] ?? 'bg-gray-800 text-gray-400'}`}>
                              {STATUS_LABEL[job.status] ?? job.status}
                            </span>
                            <span className="text-[var(--color-text-muted)]">
                              {new Date(job.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[var(--color-text)] line-clamp-2">{job.message}</p>
                          <p className="text-[var(--color-text-muted)] mt-1">
                            {job.target_count != null ? `対象: ${job.target_count}人` : '対象: 集計中'}
                            {job.status === 'done' && ` / 送信: ${job.sent_count}人`}
                            {job.scheduled_at && ` / 予定: ${new Date(job.scheduled_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
