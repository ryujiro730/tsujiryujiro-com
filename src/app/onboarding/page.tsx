'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ChevronLeft, ChevronRight, Heart, X } from 'lucide-react'
import Image from 'next/image'

type Character = {
  id: string
  name: string
  age: number
  description: string
  personality: string
  avatar_url: string
  photos: string[]
}

const GENDER_OPTIONS = [
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
  { value: 'other', label: 'その他' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Step 1
  const [name, setName] = useState('')
  // Step 2
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  // Step 3
  const [characters, setCharacters] = useState<Character[]>([])
  const [charIndex, setCharIndex] = useState(0)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [charLoading, setCharLoading] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('display_name, age, gender').eq('id', user.id).single()

      if (profile?.display_name) setName(profile.display_name)
      if (profile?.age) setAge(String(profile.age))
      if (profile?.gender) setGender(profile.gender)

      setLoading(false)
    }
    init()
  }, [])

  const loadCharacters = async () => {
    setCharLoading(true)
    const { data: chars } = await supabase
      .from('characters')
      .select('id, name, age, description, personality, avatar_url')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (!chars || chars.length === 0) { setCharLoading(false); return }

    // 各キャラのフォトを取得
    const { data: allPhotos } = await supabase
      .from('character_photos').select('character_id, url').order('order_index')

    const photoMap: Record<string, string[]> = {}
    for (const p of allPhotos ?? []) {
      if (!photoMap[p.character_id]) photoMap[p.character_id] = []
      photoMap[p.character_id].push(p.url)
    }

    setCharacters(chars.map(c => ({
      ...c,
      photos: [c.avatar_url, ...(photoMap[c.id] ?? [])],
    })))
    setCharLoading(false)
  }

  const goToStep2 = () => {
    if (!name.trim()) return
    setStep(2)
  }

  const goToStep3 = async () => {
    if (!age || !gender) return
    setSaving(true)
    const res = await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, age, gender }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      alert('保存に失敗しました: ' + (data.error ?? ''))
      return
    }
    setStep(3)
    loadCharacters()
  }

  const selectCharacter = async (charId: string) => {
    router.push(`/chat?character=${charId}`)
  }

  const nextChar = () => {
    setCharIndex(i => (i + 1) % characters.length)
    setPhotoIndex(0)
  }

  const prevChar = () => {
    setCharIndex(i => (i - 1 + characters.length) % characters.length)
    setPhotoIndex(0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[var(--color-primary)]" size={28} />
      </div>
    )
  }

  // ステップインジケーター
  const StepDots = () => (
    <div className="flex justify-center gap-2 mb-8">
      {[1, 2, 3].map(s => (
        <div
          key={s}
          className="rounded-full transition-all duration-300"
          style={{
            width: s === step ? '24px' : '8px',
            height: '8px',
            background: s <= step ? 'var(--color-primary)' : 'var(--color-border)',
          }}
        />
      ))}
    </div>
  )

  // ── Step 1: 名前 ──────────────────────────────────
  if (step === 1) {
    return (
      <div>
        <StepDots />
        <h1 className="text-2xl font-bold mb-2">あなたのお名前は？</h1>
        <p className="text-[var(--color-text-muted)] text-sm mb-8">
          キャラクターがこの名前で呼びかけます
        </p>

        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="ニックネーム"
          className="input-warm w-full px-4 py-4 text-lg mb-8 text-center"
          autoFocus
          onKeyDown={e => e.key === 'Enter' && goToStep2()}
        />

        <button
          onClick={goToStep2}
          disabled={!name.trim()}
          className="btn-primary w-full py-4 text-base font-semibold disabled:opacity-50"
        >
          次へ
        </button>
      </div>
    )
  }

  // ── Step 2: 年齢・性別 ────────────────────────────
  if (step === 2) {
    return (
      <div>
        <StepDots />
        <button
          onClick={() => setStep(1)}
          className="flex items-center gap-1 text-[var(--color-text-muted)] text-sm mb-6 hover:text-[var(--color-text)] transition-colors"
        >
          <ChevronLeft size={16} />
          戻る
        </button>

        <h1 className="text-2xl font-bold mb-2">プロフィール設定</h1>
        <p className="text-[var(--color-text-muted)] text-sm mb-8">
          キャラクターとの会話に使います
        </p>

        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-2 block">年齢</label>
            <input
              type="number"
              value={age}
              onChange={e => setAge(e.target.value)}
              placeholder="例: 25"
              min={18} max={99}
              className="input-warm w-full px-4 py-3 text-base"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-3 block">性別</label>
            <div className="grid grid-cols-3 gap-3">
              {GENDER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setGender(opt.value)}
                  className="py-3 rounded-xl border text-sm font-medium transition-all"
                  style={{
                    borderColor: gender === opt.value ? 'var(--color-primary)' : 'var(--color-border)',
                    background: gender === opt.value ? 'var(--color-primary)' : 'var(--color-surface-2)',
                    color: gender === opt.value ? '#fff' : 'var(--color-text)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={goToStep3}
          disabled={!age || !gender || saving}
          className="btn-primary w-full py-4 text-base font-semibold mt-10 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          次へ
        </button>
      </div>
    )
  }

  // ── Step 3: キャラ選択（Tinder風） ─────────────────
  if (charLoading || characters.length === 0) {
    return (
      <div>
        <StepDots />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-[var(--color-primary)]" size={28} />
        </div>
      </div>
    )
  }

  const char = characters[charIndex]
  const photos = char.photos
  const currentPhoto = photos[photoIndex] ?? char.avatar_url

  return (
    <div>
      <StepDots />
      <h1 className="text-xl font-bold mb-1 text-center">話したい子を選んで</h1>
      <p className="text-[var(--color-text-muted)] text-sm mb-5 text-center">
        {charIndex + 1} / {characters.length}
      </p>

      {/* カード */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl mb-5" style={{ aspectRatio: '3/4' }}>
        {/* 写真 */}
        <Image
          src={currentPhoto}
          alt={char.name}
          fill
          className="object-cover"
          priority
        />

        {/* フォトナビ（左右タップ） */}
        {photos.length > 1 && (
          <>
            <button
              onClick={() => setPhotoIndex(i => Math.max(0, i - 1))}
              className="absolute left-0 top-0 h-full w-1/3 z-10"
              style={{ opacity: 0 }}
              aria-label="前の写真"
            />
            <button
              onClick={() => setPhotoIndex(i => Math.min(photos.length - 1, i + 1))}
              className="absolute right-0 top-0 h-full w-2/3 z-10"
              style={{ opacity: 0 }}
              aria-label="次の写真"
            />
          </>
        )}

        {/* フォトドット */}
        {photos.length > 1 && (
          <div className="absolute top-3 left-0 right-0 z-20 flex justify-center gap-1 px-4">
            {photos.map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-full transition-all"
                style={{
                  height: '3px',
                  maxWidth: '48px',
                  background: i === photoIndex ? '#fff' : 'rgba(255,255,255,0.4)',
                }}
              />
            ))}
          </div>
        )}

        {/* 名前オーバーレイ */}
        <div
          className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-5 pt-16"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)' }}
        >
          <p className="text-white font-bold text-2xl">{char.name}<span className="text-base font-normal ml-2 opacity-80">{char.age}歳</span></p>
          {char.personality && (
            <p className="text-white/70 text-xs mt-1">{char.personality}</p>
          )}
        </div>
      </div>

      {/* 自己紹介 */}
      <p className="text-[var(--color-text-muted)] text-sm text-center leading-relaxed mb-6 px-2">
        {char.description}
      </p>

      {/* アクションボタン */}
      <div className="flex items-center justify-center gap-6">
        {/* パス */}
        <button
          onClick={nextChar}
          className="w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all hover:scale-110 active:scale-95"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}
          title="パス"
        >
          <X size={24} className="text-[var(--color-text-muted)]" />
        </button>

        {/* 話す */}
        <button
          onClick={() => selectCharacter(char.id)}
          className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
          style={{ background: 'var(--color-primary)', boxShadow: '0 0 24px var(--color-primary-glow)' }}
          title={`${char.name}と話す`}
        >
          <Heart size={32} className="text-white" fill="white" />
        </button>

        {/* 前のキャラ */}
        <button
          onClick={prevChar}
          className="w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all hover:scale-110 active:scale-95"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}
          title="戻る"
        >
          <ChevronLeft size={24} className="text-[var(--color-text-muted)]" />
        </button>
      </div>

      <p className="text-xs text-center text-[var(--color-text-muted)] mt-5">
        ❤️ で話す・✕ で次のキャラへ
      </p>
    </div>
  )
}
