'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ChevronLeft } from 'lucide-react'
import { trackSignUp, trackOnboardingStart } from '@/lib/gtag'

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

  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('display_name, age, gender').eq('id', user.id).single()

      if (profile?.display_name) setName(profile.display_name)
      if (profile?.age) setAge(String(profile.age))
      if (profile?.gender) setGender(profile.gender)

      // プロフィールが完成済みならチャットへ
      if (profile?.display_name && profile?.age && profile?.gender) {
        window.location.href = '/chat'
        return
      }

      setLoading(false)
      trackOnboardingStart()
    }
    init()
  }, [])

  const goToStep2 = () => {
    if (!name.trim()) return
    setStep(2)
  }

  const complete = async () => {
    if (!age || !gender) return
    if (parseInt(age) < 18) {
      alert('ご利用は18歳以上の方に限られます。')
      return
    }
    setSaving(true)
    const referralSource = sessionStorage.getItem('referral_source') ?? undefined
    const referralArticle = sessionStorage.getItem('referral_article') ?? undefined
    const referralByCode = sessionStorage.getItem('referral_by_code') ?? undefined
    const res = await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, age, gender, referralSource, referralArticle, referralByCode }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      alert('保存に失敗しました: ' + (data.error ?? ''))
      return
    }
    trackSignUp({ referral_source: referralSource })
    sessionStorage.removeItem('referral_source')
    sessionStorage.removeItem('referral_article')
    sessionStorage.removeItem('referral_by_code')
    window.location.href = '/chat'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[var(--color-primary)]" size={28} />
      </div>
    )
  }

  const StepDots = () => (
    <div className="flex justify-center gap-2 mb-8">
      {[1, 2].map(s => (
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
        onClick={complete}
        disabled={!age || !gender || saving}
        className="btn-primary w-full py-4 text-base font-semibold mt-10 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving && <Loader2 size={16} className="animate-spin" />}
        はじめる
      </button>
    </div>
  )
}
