'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('メールアドレスまたはパスワードが違います')
      setLoading(false)
      return
    }

    try {
      const [{ data: profile }] = await Promise.all([
        Promise.race([
          supabase.from('profiles').select('role').eq('id', data.user.id).single(),
          new Promise<{ data: null }>((r) => setTimeout(() => r({ data: null }), 2000)),
        ]) as Promise<{ data: { role: string } | null }>,
        supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', data.user.id),
      ])

      router.push(profile?.role === 'admin' ? '/admin' : '/characters')
    } catch {
      router.push('/characters')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">ログイン</h1>
      <p className="text-[var(--color-text-muted)] text-sm mb-8">
        
      </p>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">メールアドレス</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)} required
            className="input-warm w-full px-4 py-3 text-sm"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block">パスワード</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)} required
              className="input-warm w-full px-4 py-3 text-sm pr-11"
              placeholder="••••••••"
            />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button type="submit" disabled={loading}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60">
          {loading && <Loader2 size={15} className="animate-spin" />}
          ログイン
        </button>
      </form>

      <p className="text-[var(--color-text-muted)] text-sm mt-6 text-center">
        まだアカウントがない方は{' '}
        <Link href="/auth/register" className="hover:underline" style={{ color: 'var(--color-primary)' }}>
          新規登録（5通無料）
        </Link>
      </p>
    </div>
  )
}
