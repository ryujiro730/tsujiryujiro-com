'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Check, LogOut, KeyRound, Trash2 } from 'lucide-react'
import type { Profile } from '@/types'
import Link from 'next/link'

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // パスワード変更
  const [showPwForm, setShowPwForm] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  // アカウント削除
  const [showDeleteForm, setShowDeleteForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

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

  const handleChangePassword = async () => {
    setPwError('')
    if (newPw.length < 8) { setPwError('パスワードは8文字以上にしてください'); return }
    if (newPw !== confirmPw) { setPwError('新しいパスワードが一致しません'); return }
    setPwSaving(true)
    // 現在のパスワードで再認証
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { setPwError('ユーザー情報を取得できません'); setPwSaving(false); return }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPw })
    if (signInError) { setPwError('現在のパスワードが正しくありません'); setPwSaving(false); return }
    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) { setPwError(error.message); setPwSaving(false); return }
    setPwSaving(false)
    setPwSaved(true)
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
    setTimeout(() => { setPwSaved(false); setShowPwForm(false) }, 2000)
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== '削除する') return
    setDeleting(true)
    const res = await fetch('/api/account/delete', { method: 'DELETE' })
    if (!res.ok) {
      alert('削除に失敗しました。しばらくしてから再試行してください。')
      setDeleting(false)
      return
    }
    await supabase.auth.signOut()
    router.push('/')
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

      {/* パスワード変更 */}
      <div className="card p-5 mb-4">
        <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wider mb-4">セキュリティ</p>
        <button
          onClick={() => { setShowPwForm(v => !v); setPwError(''); setPwSaved(false) }}
          className="flex items-center gap-2 text-sm text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors"
        >
          <KeyRound size={15} />
          パスワードを変更する
        </button>

        {showPwForm && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">現在のパスワード</label>
              <input
                type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                className="input-warm w-full px-4 py-2.5 text-sm"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">新しいパスワード（8文字以上）</label>
              <input
                type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                className="input-warm w-full px-4 py-2.5 text-sm"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">新しいパスワード（確認）</label>
              <input
                type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                className="input-warm w-full px-4 py-2.5 text-sm"
                placeholder="••••••••"
              />
            </div>
            {pwError && <p className="text-red-400 text-xs">{pwError}</p>}
            {pwSaved && <p className="text-emerald-400 text-xs flex items-center gap-1"><Check size={12} />パスワードを変更しました</p>}
            <button
              onClick={handleChangePassword}
              disabled={pwSaving || !currentPw || !newPw || !confirmPw}
              className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5 disabled:opacity-60"
            >
              {pwSaving ? <Loader2 size={13} className="animate-spin" /> : null}
              変更する
            </button>
          </div>
        )}
      </div>

      {/* アカウント削除 */}
      <div className="card p-5 mb-4">
        <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wider mb-4">アカウント</p>
        <button
          onClick={() => setShowDeleteForm(v => !v)}
          className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
        >
          <Trash2 size={15} />
          アカウントを削除する
        </button>

        {showDeleteForm && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              削除すると、すべてのデータ（会話履歴・ポイント）が完全に削除されます。この操作は取り消せません。
            </p>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">
                確認のため <span className="text-[var(--color-text)]">「削除する」</span> と入力してください
              </label>
              <input
                type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                className="input-warm w-full px-4 py-2.5 text-sm"
                placeholder="削除する"
              />
            </div>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirm !== '削除する'}
              className="w-full py-2.5 rounded-xl text-sm text-red-400 flex items-center justify-center gap-2 border border-red-900/40 hover:bg-red-950/30 transition-colors disabled:opacity-40"
            >
              {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              アカウントを完全に削除する
            </button>
          </div>
        )}
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
