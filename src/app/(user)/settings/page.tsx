'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Check, LogOut } from 'lucide-react'
import type { Profile } from '@/types'
import Link from 'next/link'

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) { setProfile(data); setDisplayName(data.display_name ?? '') }
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    if (!profile || !displayName.trim()) return
    setSaving(true)
    await supabase.from('profiles').update({ display_name: displayName.trim() }).eq('id', profile.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[var(--color-primary)]" size={22} />
      </div>
    )
  }

  return (
    <div className="pt-2 max-w-sm">
      <h1 className="text-xl font-bold mb-6">設定</h1>

      {/* Profile */}
      <div className="card p-5 mb-4">
        <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wider mb-4">プロフィール</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">ニックネーム</label>
            <input
              type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="input-warm w-full px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">メールアドレス</label>
            <p className="text-sm text-[var(--color-text-muted)] px-1">{profile?.email}</p>
          </div>
          <button onClick={handleSave} disabled={saving || !displayName.trim()}
            className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5 disabled:opacity-60">
            {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
            {saved ? '保存しました' : '保存'}
          </button>
        </div>
      </div>

      {/* Balance */}
      <div className="card p-5 mb-4">
        <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wider mb-4">残高</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">トークン残高</span>
            <span style={{ color: 'var(--color-accent)' }}>{profile?.points ?? 0}T</span>
          </div>
        </div>
        <Link href="/payment" className="text-xs mt-3 block" style={{ color: 'var(--color-primary)' }}>
          トークンを購入する →
        </Link>
      </div>

      {/* Sign out */}
      <button onClick={handleSignOut}
        className="w-full py-2.5 rounded-xl text-sm text-red-400 flex items-center justify-center gap-2 border border-red-900/40 hover:bg-red-950/30 transition-colors">
        <LogOut size={14} />
        ログアウト
      </button>
    </div>
  )
}
