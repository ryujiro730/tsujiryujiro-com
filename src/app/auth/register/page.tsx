'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref') || params.get('source')
    if (ref) sessionStorage.setItem('referral_source', ref)
    const refBy = params.get('ref_by')
    if (refBy) sessionStorage.setItem('referral_by_code', refBy)
  }, [])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) { setError(error.message); setLoading(false); return }

    setDone(true)
  }

  if (done) {
    return (
      <div>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>📩</div>
        <h1 className="text-2xl font-bold mb-3">確認メールを送りました</h1>
        <p className="text-[var(--color-text-muted)] text-sm leading-relaxed mb-4">
          <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{email}</span> に確認メールを送りました。
        </p>
        <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">
          メール内の<strong style={{ color: 'var(--color-text)' }}>「メールアドレスを確認する」</strong>ボタンをクリックして登録を完了してください。
        </p>
        <p className="text-[var(--color-text-muted)] text-xs mt-5 leading-relaxed">
          メールが届かない場合は迷惑メールフォルダをご確認ください。
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">はじめまして</h1>
      <p className="text-[var(--color-text-muted)] text-sm mb-8">
        登録は30秒くらいで終わります。
      </p>

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">メールアドレス</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)} required
            className="input-warm w-full px-4 py-3 text-sm"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">パスワード（8文字以上）</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            required minLength={8}
            className="input-warm w-full px-4 py-3 text-sm"
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button type="submit" disabled={loading}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60">
          {loading && <Loader2 size={15} className="animate-spin" />}
          登録して話しかける
        </button>
      </form>

      <p className="text-[var(--color-text-muted)] text-xs mt-4 leading-relaxed">
        登録することで利用規約・プライバシーポリシーに同意したことになります
      </p>

      <p className="text-[var(--color-text-muted)] text-sm mt-5 text-center">
        すでに登録済みの方は{' '}
        <Link href="/auth/login" className="hover:underline" style={{ color: 'var(--color-primary)' }}>
          ログイン
        </Link>
      </p>
    </div>
  )
}
