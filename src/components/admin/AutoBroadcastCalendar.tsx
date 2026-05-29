'use client'

import { useMemo, useRef, useState } from 'react'
import { Plus, Edit2, Trash2, Loader2, Check, X, Power, ImagePlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ── パレット ─────────────────────────────────────────────
const CHAR_PALETTES = [
  { dot: 'bg-pink-400',    badge: 'bg-pink-900/40 text-pink-300 border-pink-700/40',    ring: 'ring-pink-500/60' },
  { dot: 'bg-purple-400',  badge: 'bg-purple-900/40 text-purple-300 border-purple-700/40', ring: 'ring-purple-500/60' },
  { dot: 'bg-blue-400',    badge: 'bg-blue-900/40 text-blue-300 border-blue-700/40',    ring: 'ring-blue-500/60' },
  { dot: 'bg-emerald-400', badge: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40', ring: 'ring-emerald-500/60' },
  { dot: 'bg-amber-400',   badge: 'bg-amber-900/40 text-amber-300 border-amber-700/40', ring: 'ring-amber-500/60' },
  { dot: 'bg-rose-400',    badge: 'bg-rose-900/40 text-rose-300 border-rose-700/40',    ring: 'ring-rose-500/60' },
  { dot: 'bg-cyan-400',    badge: 'bg-cyan-900/40 text-cyan-300 border-cyan-700/40',    ring: 'ring-cyan-500/60' },
  { dot: 'bg-indigo-400',  badge: 'bg-indigo-900/40 text-indigo-300 border-indigo-700/40', ring: 'ring-indigo-500/60' },
]

// ── 型 ──────────────────────────────────────────────────
interface Step { id: string; step_number: number; delay_minutes: number; message: string; image_url?: string | null }
interface Sequence {
  id: string; name: string; is_active: boolean
  character_id: string; character_name: string; character_avatar: string | null
  steps: Step[]
}
interface Character { id: string; name: string; avatar_url: string | null }
interface Props { sequences: Sequence[]; characters: Character[] }

async function compressImage(file: File, maxSize = 1200, quality = 0.85): Promise<Blob> {
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

function formatDelay(minutes: number) {
  if (minutes === 0) return '登録直後'
  const d = Math.floor(minutes / 1440)
  const h = Math.floor((minutes % 1440) / 60)
  const m = minutes % 60
  const parts = []
  if (d > 0) parts.push(`${d}日後`)
  if (h > 0) parts.push(`${h}時間`)
  if (m > 0) parts.push(`${m}分`)
  return parts.join('') || '0分'
}

function minutesToParts(total: number) {
  const days = Math.floor(total / 1440)
  const hours = Math.floor((total % 1440) / 60)
  const mins = total % 60
  return { days, hours, mins }
}

function partsToMinutes(days: number, hours: number, mins: number) {
  return days * 1440 + hours * 60 + mins
}

// 日・時・分で指定するピッカー
function DelayInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const total = parseInt(value) || 0
  const { days, hours, mins } = minutesToParts(total)

  const update = (d: number, h: number, m: number) => {
    onChange(String(partsToMinutes(d, h, m)))
  }

  const sel = 'w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[var(--color-primary)] text-center'

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        <input
          type="number" min={0} max={365} value={days}
          onChange={e => update(Math.max(0, parseInt(e.target.value) || 0), hours, mins)}
          className={sel} style={{ width: 52 }}
        />
        <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">日</span>
      </div>
      <div className="flex items-center gap-0.5">
        <input
          type="number" min={0} max={23} value={hours}
          onChange={e => update(days, Math.min(23, Math.max(0, parseInt(e.target.value) || 0)), mins)}
          className={sel} style={{ width: 44 }}
        />
        <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">時間</span>
      </div>
      <div className="flex items-center gap-0.5">
        <input
          type="number" min={0} max={59} value={mins}
          onChange={e => update(days, hours, Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
          className={sel} style={{ width: 44 }}
        />
        <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">分後</span>
      </div>
    </div>
  )
}

// ── メインコンポーネント ─────────────────────────────────
export default function AutoBroadcastCalendar({ sequences: init, characters }: Props) {
  const [sequences, setSequences] = useState<Sequence[]>(init)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNewSeq, setShowNewSeq] = useState(false)

  const charIds = useMemo(() => Array.from(new Set(sequences.map(s => s.character_id))), [sequences])
  const paletteMap = useMemo(() => {
    const m = new Map<string, typeof CHAR_PALETTES[0]>()
    charIds.forEach((id, i) => m.set(id, CHAR_PALETTES[i % CHAR_PALETTES.length]))
    return m
  }, [charIds])

  const allSteps = useMemo(() =>
    sequences.filter(s => s.is_active).flatMap(s => s.steps.map(step => ({ ...step, sequence: s }))),
    [sequences]
  )

  const days = useMemo(() => {
    if (allSteps.length === 0) return []
    const maxMinutes = Math.max(...allSteps.map(s => s.delay_minutes))
    const dayCount = Math.max(Math.floor(maxMinutes / 1440) + 1, 7)
    return Array.from({ length: dayCount }, (_, day) => {
      const daySteps = allSteps.filter(s => Math.floor(s.delay_minutes / 1440) === day)
      const byMinute = new Map<number, typeof daySteps>()
      for (const s of daySteps) {
        if (!byMinute.has(s.delay_minutes)) byMinute.set(s.delay_minutes, [])
        byMinute.get(s.delay_minutes)!.push(s)
      }
      return { day, byMinute }
    })
  }, [allSteps])

  const conflictMinutes = useMemo(() => {
    const minuteChars = new Map<number, Set<string>>()
    for (const s of allSteps) {
      if (!minuteChars.has(s.delay_minutes)) minuteChars.set(s.delay_minutes, new Set())
      minuteChars.get(s.delay_minutes)!.add(s.sequence.character_id)
    }
    const c = new Set<number>()
    minuteChars.forEach((chars, m) => { if (chars.size > 1) c.add(m) })
    return c
  }, [allSteps])

  const selectedSeq = sequences.find(s => s.id === selectedId) ?? null

  // ── シーケンス操作 ───────────────────────────────────
  const updateSeq = (updated: Sequence) =>
    setSequences(prev => prev.map(s => s.id === updated.id ? updated : s))

  const removeSeq = (id: string) => {
    setSequences(prev => prev.filter(s => s.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const addSeq = (seq: Sequence) => {
    setSequences(prev => [...prev, seq])
    setSelectedId(seq.id)
    setShowNewSeq(false)
  }

  return (
    <div className="flex gap-5 items-start">

      {/* ── 左: カレンダー ─────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Legend + 新規ボタン */}
        <div className="glass rounded-xl px-4 py-3 flex flex-wrap gap-3 items-center">
          {sequences.map(seq => {
            const p = paletteMap.get(seq.character_id) ?? CHAR_PALETTES[0]
            return (
              <button
                key={seq.id}
                onClick={() => { setSelectedId(seq.id); setShowNewSeq(false) }}
                className={`flex items-center gap-2 text-xs rounded-lg px-2 py-1 transition-all ${
                  selectedId === seq.id ? 'ring-2 ' + p.ring + ' bg-[var(--color-surface-2)]' : 'hover:bg-[var(--color-surface-2)]'
                }`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${p.dot} ${!seq.is_active ? 'opacity-30' : ''}`} />
                <span className={seq.is_active ? '' : 'opacity-40 line-through'}>
                  {seq.character_name}／{seq.name}
                </span>
              </button>
            )
          })}
          {conflictMinutes.size > 0 && (
            <div className="flex items-center gap-2 text-xs ml-auto">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="text-red-400">競合あり</span>
            </div>
          )}
          <button
            onClick={() => { setShowNewSeq(true); setSelectedId(null) }}
            className="ml-auto btn-primary px-3 py-1 text-xs flex items-center gap-1"
          >
            <Plus size={12} />新規シーケンス
          </button>
        </div>

        {/* Timeline */}
        {sequences.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center text-[var(--color-text-muted)] text-sm">
            シーケンスがまだありません。右の「新規シーケンス」から作成してください。
          </div>
        ) : allSteps.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center text-[var(--color-text-muted)] text-sm">
            有効なシーケンスがありません
          </div>
        ) : (
          <>
            <div className="glass rounded-2xl overflow-hidden">
              <div className="grid grid-cols-[90px_1fr] border-b border-[var(--color-border)]">
                <div className="px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)]">経過</div>
                <div className="px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)]">送信スケジュール</div>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {days.map(({ day, byMinute }) => (
                  <div key={day} className="grid grid-cols-[90px_1fr] min-h-[52px]">
                    <div className="px-4 py-3 flex flex-col justify-center border-r border-[var(--color-border)]">
                      <span className={`text-xs font-semibold ${day === 0 ? 'text-[var(--color-primary-light)]' : ''}`}>
                        Day {day}
                      </span>
                      {day === 0 && <span className="text-[10px] text-[var(--color-text-muted)]">登録直後〜</span>}
                    </div>
                    <div className="px-3 py-2.5 flex flex-wrap gap-1.5 items-start content-start">
                      {byMinute.size === 0 ? (
                        <span className="text-xs text-[var(--color-text-muted)] self-center opacity-40">—</span>
                      ) : (
                        Array.from(byMinute.entries()).sort(([a], [b]) => a - b).map(([minutes, steps]) => {
                          const isConflict = conflictMinutes.has(minutes)
                          return (
                            <div
                              key={minutes}
                              className={`rounded-xl border px-2.5 py-1.5 space-y-1 ${
                                isConflict ? 'border-red-700/50 bg-red-900/20' : 'border-[var(--color-border)] bg-[var(--color-surface-2)]'
                              }`}
                            >
                              <div className={`text-[10px] font-medium ${isConflict ? 'text-red-400' : 'text-[var(--color-text-muted)]'}`}>
                                {isConflict && '⚠ '}{formatDelay(minutes)}
                              </div>
                              {steps.map((s, i) => {
                                const p = paletteMap.get(s.sequence.character_id) ?? CHAR_PALETTES[0]
                                const isSelected = selectedId === s.sequence.id
                                return (
                                  <button
                                    key={i}
                                    onClick={() => { setSelectedId(s.sequence.id); setShowNewSeq(false) }}
                                    className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 border text-xs transition-all ${
                                      isConflict ? 'bg-red-900/30 text-red-300 border-red-700/40' : p.badge
                                    } ${isSelected ? 'ring-2 ' + p.ring : 'hover:opacity-80'}`}
                                  >
                                    {s.sequence.character_avatar && (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={s.sequence.character_avatar} alt="" className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
                                    )}
                                    <span className="font-medium truncate max-w-[90px]">{s.sequence.character_name}</span>
                                    <span className="opacity-60 shrink-0">#{s.step_number}</span>
                                  </button>
                                )
                              })}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {conflictMinutes.size > 0 && (
              <div className="glass rounded-xl border border-red-700/40 px-4 py-3 text-sm text-red-300">
                <span className="font-semibold">競合が {conflictMinutes.size} 箇所あります。</span>
                {' '}同じタイミングに複数キャラが送信するとユーザー体験が損なわれます。
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 右: 詳細・編集パネル ──────────────────── */}
      <div className="w-96 flex-shrink-0 sticky top-20">
        {showNewSeq ? (
          <NewSequencePanel
            characters={characters}
            onCreated={addSeq}
            onCancel={() => setShowNewSeq(false)}
          />
        ) : selectedSeq ? (
          <SequenceDetailPanel
            key={selectedSeq.id}
            sequence={selectedSeq}
            palette={paletteMap.get(selectedSeq.character_id) ?? CHAR_PALETTES[0]}
            onUpdate={updateSeq}
            onDelete={() => removeSeq(selectedSeq.id)}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <div className="glass rounded-2xl p-8 text-center text-[var(--color-text-muted)] text-sm space-y-2">
            <p>← 凡例またはバッジをクリックすると</p>
            <p>シーケンスの詳細を確認・編集できます</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 新規シーケンス作成パネル ─────────────────────────────
function NewSequencePanel({ characters, onCreated, onCancel }: {
  characters: Character[]
  onCreated: (seq: Sequence) => void
  onCancel: () => void
}) {
  const [charId, setCharId] = useState(characters[0]?.id ?? '')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = async () => {
    if (!charId || !name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/auto-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: charId, name: name.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        const char = characters.find(c => c.id === charId)
        onCreated({
          id: data.id, name: data.name, is_active: data.is_active,
          character_id: charId,
          character_name: char?.name ?? '不明',
          character_avatar: char?.avatar_url ?? null,
          steps: [],
        })
      } else {
        setError(data.error ?? `エラー (${res.status})`)
      }
    } catch {
      setError('通信エラーが発生しました')
    }
    setSaving(false)
  }

  if (characters.length === 0) {
    return (
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">新規シーケンス</h2>
          <button onClick={onCancel} className="p-1 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
            <X size={14} />
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">
          有効なキャラクターがありません。先にキャラ管理でキャラクターを作成してください。
        </p>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">新規シーケンス</h2>
        <button onClick={onCancel} className="p-1 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
          <X size={14} />
        </button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1 block">キャラクター</label>
          <select
            value={charId}
            onChange={e => setCharId(e.target.value)}
            className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
          >
            {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1 block">シーケンス名</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && create()}
            placeholder="例：登録直後フォロー"
            autoFocus
            className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        {error && (
          <p className="text-xs text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
        )}
        <button
          onClick={create}
          disabled={saving || !name.trim() || !charId}
          className="w-full btn-primary py-2 text-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          作成
        </button>
      </div>
    </div>
  )
}

// ── シーケンス詳細・編集パネル ────────────────────────────
function SequenceDetailPanel({ sequence, palette, onUpdate, onDelete, onClose }: {
  sequence: Sequence
  palette: typeof CHAR_PALETTES[0]
  onUpdate: (seq: Sequence) => void
  onDelete: () => void
  onClose: () => void
}) {
  const supabase = createClient()
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(sequence.name)
  const [toggling, setToggling] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [stepForm, setStepForm] = useState<{ delay_minutes: string; message: string; image_url: string | null }>({ delay_minutes: '', message: '', image_url: null })
  const [newStepForm, setNewStepForm] = useState<{ delay_minutes: string; message: string; image_url: string | null }>({ delay_minutes: '', message: '', image_url: null })
  const [addingStep, setAddingStep] = useState(false)
  const [deletingStepId, setDeletingStepId] = useState<string | null>(null)
  const [uploadingEdit, setUploadingEdit] = useState(false)
  const [uploadingAdd, setUploadingAdd] = useState(false)
  const editFileRef = useRef<HTMLInputElement>(null)
  const addFileRef = useRef<HTMLInputElement>(null)

  const uploadImage = async (file: File): Promise<string | null> => {
    const compressed = await compressImage(file)
    const fileName = `broadcast/${Date.now()}.webp`
    const { error } = await supabase.storage.from('avatars').upload(fileName, compressed, { upsert: true, contentType: 'image/webp' })
    if (error) { alert('アップロード失敗: ' + error.message); return null }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
    return publicUrl
  }

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingEdit(true)
    const url = await uploadImage(file)
    if (url) setStepForm(f => ({ ...f, image_url: url }))
    setUploadingEdit(false)
    e.target.value = ''
  }

  const handleAddImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingAdd(true)
    const url = await uploadImage(file)
    if (url) setNewStepForm(f => ({ ...f, image_url: url }))
    setUploadingAdd(false)
    e.target.value = ''
  }

  const saveName = async () => {
    if (!nameVal.trim() || nameVal === sequence.name) { setEditingName(false); return }
    const res = await fetch(`/api/admin/auto-broadcast/${sequence.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameVal.trim() }),
    })
    if (res.ok) onUpdate({ ...sequence, name: nameVal.trim() })
    setEditingName(false)
  }

  const toggleActive = async () => {
    setToggling(true)
    const res = await fetch(`/api/admin/auto-broadcast/${sequence.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !sequence.is_active }),
    })
    if (res.ok) onUpdate({ ...sequence, is_active: !sequence.is_active })
    setToggling(false)
  }

  const deleteSeq = async () => {
    if (!confirm(`「${sequence.name}」を削除しますか？`)) return
    setDeleting(true)
    const res = await fetch(`/api/admin/auto-broadcast/${sequence.id}`, { method: 'DELETE' })
    if (res.ok) onDelete()
    setDeleting(false)
  }

  const startEditStep = (step: Step) => {
    setEditingStepId(step.id)
    setStepForm({ delay_minutes: String(step.delay_minutes), message: step.message, image_url: step.image_url ?? null })
  }

  const saveStep = async (stepId: string) => {
    const dm = parseInt(stepForm.delay_minutes)
    if (isNaN(dm) || dm < 0 || !stepForm.message.trim()) return
    const res = await fetch(`/api/admin/auto-broadcast/steps/${stepId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delay_minutes: dm, message: stepForm.message.trim(), image_url: stepForm.image_url }),
    })
    if (res.ok) {
      const updated = await res.json()
      onUpdate({ ...sequence, steps: sequence.steps.map(s => s.id === stepId ? updated : s) })
    }
    setEditingStepId(null)
  }

  const deleteStep = async (stepId: string) => {
    if (!confirm('このステップを削除しますか？')) return
    setDeletingStepId(stepId)
    const res = await fetch(`/api/admin/auto-broadcast/steps/${stepId}`, { method: 'DELETE' })
    if (res.ok) onUpdate({ ...sequence, steps: sequence.steps.filter(s => s.id !== stepId) })
    setDeletingStepId(null)
  }

  const addStep = async () => {
    const dm = parseInt(newStepForm.delay_minutes)
    if (isNaN(dm) || dm < 0 || !newStepForm.message.trim()) return
    setAddingStep(true)
    const res = await fetch(`/api/admin/auto-broadcast/${sequence.id}/steps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delay_minutes: dm, message: newStepForm.message.trim(), image_url: newStepForm.image_url }),
    })
    if (res.ok) {
      const newStep = await res.json()
      onUpdate({ ...sequence, steps: [...sequence.steps, newStep].sort((a, b) => a.step_number - b.step_number) })
      setNewStepForm({ delay_minutes: '', message: '', image_url: null })
    }
    setAddingStep(false)
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* ヘッダー */}
      <div className="px-5 py-4 border-b border-[var(--color-border)] space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {sequence.character_avatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sequence.character_avatar} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-[var(--color-border)]" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-[var(--color-text-muted)]">{sequence.character_name}</p>
              {editingName ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <input
                    value={nameVal}
                    onChange={e => setNameVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                    className="flex-1 bg-[var(--color-surface-2)] border border-[var(--color-primary)] rounded-lg px-2 py-0.5 text-sm focus:outline-none"
                    autoFocus
                  />
                  <button onClick={saveName} className="p-1 text-emerald-400 hover:text-emerald-300"><Check size={13} /></button>
                  <button onClick={() => { setEditingName(false); setNameVal(sequence.name) }} className="p-1 text-[var(--color-text-muted)]"><X size={13} /></button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingName(true)}
                  className="text-sm font-semibold hover:text-[var(--color-primary)] transition-colors flex items-center gap-1 group"
                >
                  {sequence.name}
                  <Edit2 size={11} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                </button>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] flex-shrink-0">
            <X size={14} />
          </button>
        </div>

        {/* コントロール */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleActive}
            disabled={toggling}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              sequence.is_active
                ? 'bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60'
                : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]'
            }`}
          >
            {toggling ? <Loader2 size={11} className="animate-spin" /> : <Power size={11} />}
            {sequence.is_active ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={deleteSeq}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-colors ml-auto"
          >
            {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
            削除
          </button>
        </div>
      </div>

      {/* ステップ一覧 */}
      <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
        <p className="text-xs font-semibold text-[var(--color-text-muted)] mb-3">
          ステップ ({sequence.steps.length}件)
        </p>

        {sequence.steps.length === 0 && (
          <p className="text-xs text-[var(--color-text-muted)] text-center py-3">まだステップがありません</p>
        )}

        {sequence.steps.map(step => (
          <div key={step.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
            {editingStepId === step.id ? (
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-[var(--color-text-muted)] mb-1">登録後</p>
                  <DelayInput
                    value={stepForm.delay_minutes}
                    onChange={v => setStepForm(f => ({ ...f, delay_minutes: v }))}
                  />
                </div>
                <textarea
                  value={stepForm.message}
                  onChange={e => setStepForm(f => ({ ...f, message: e.target.value }))}
                  rows={3}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-xs resize-none focus:outline-none focus:border-[var(--color-primary)]"
                />
                {/* 画像 */}
                <input ref={editFileRef} type="file" accept="image/*" className="hidden" onChange={handleEditImageUpload} />
                {stepForm.image_url ? (
                  <div className="relative w-24">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={stepForm.image_url} alt="" className="w-24 h-24 object-cover rounded-xl border border-[var(--color-border)]" />
                    <button
                      onClick={() => setStepForm(f => ({ ...f, image_url: null }))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => editFileRef.current?.click()}
                    disabled={uploadingEdit}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors disabled:opacity-50"
                  >
                    {uploadingEdit ? <Loader2 size={11} className="animate-spin" /> : <ImagePlus size={11} />}
                    画像を追加
                  </button>
                )}
                <div className="flex gap-2">
                  <button onClick={() => saveStep(step.id)} className="btn-primary px-3 py-1 text-xs flex items-center gap-1">
                    <Check size={11} />保存
                  </button>
                  <button onClick={() => setEditingStepId(null)} className="btn-ghost px-3 py-1 text-xs">キャンセル</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--color-primary)' }}>
                    #{step.step_number} · 登録後 {formatDelay(step.delay_minutes)}
                  </p>
                  {step.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={step.image_url} alt="" className="w-20 h-20 object-cover rounded-xl border border-[var(--color-border)] mb-1" />
                  )}
                  <p className="text-xs text-[var(--color-text)] whitespace-pre-wrap leading-relaxed">{step.message}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => startEditStep(step)} className="p-1.5 rounded hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                    <Edit2 size={11} />
                  </button>
                  <button
                    onClick={() => deleteStep(step.id)}
                    disabled={deletingStepId === step.id}
                    className="p-1.5 rounded hover:bg-red-900/30 text-[var(--color-text-muted)] hover:text-red-400 disabled:opacity-40"
                  >
                    {deletingStepId === step.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* ステップ追加フォーム */}
        <div className="rounded-xl border border-dashed border-[var(--color-border)] p-3 space-y-2 mt-2">
          <p className="text-xs font-medium text-[var(--color-text-muted)]">ステップを追加</p>
          <div>
            <p className="text-xs text-[var(--color-text-muted)] mb-1">登録後</p>
            <DelayInput
              value={newStepForm.delay_minutes}
              onChange={v => setNewStepForm(f => ({ ...f, delay_minutes: v }))}
            />
          </div>
          <textarea
            value={newStepForm.message}
            onChange={e => setNewStepForm(f => ({ ...f, message: e.target.value }))}
            rows={3}
            placeholder="送信するメッセージ..."
            className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-xs resize-none focus:outline-none focus:border-[var(--color-primary)]"
          />
          {/* 画像 */}
          <input ref={addFileRef} type="file" accept="image/*" className="hidden" onChange={handleAddImageUpload} />
          {newStepForm.image_url ? (
            <div className="relative w-24">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={newStepForm.image_url} alt="" className="w-24 h-24 object-cover rounded-xl border border-[var(--color-border)]" />
              <button
                onClick={() => setNewStepForm(f => ({ ...f, image_url: null }))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white"
              >
                <X size={10} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => addFileRef.current?.click()}
              disabled={uploadingAdd}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors disabled:opacity-50"
            >
              {uploadingAdd ? <Loader2 size={11} className="animate-spin" /> : <ImagePlus size={11} />}
              画像を追加（任意）
            </button>
          )}
          <button
            onClick={addStep}
            disabled={addingStep || newStepForm.delay_minutes === '' || !newStepForm.message.trim()}
            className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1 disabled:opacity-60"
          >
            {addingStep ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
            追加
          </button>
        </div>
      </div>
    </div>
  )
}
