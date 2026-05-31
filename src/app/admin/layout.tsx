import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RealtimeRefresher from './conversations/RealtimeRefresher'
import { unstable_noStore as noStore } from 'next/cache'
import { AdminNav } from '@/components/admin/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  noStore()
  const supabase = createClient() // 認証チェックはanonクライアントで

  // getUser() makes a network call — 5秒でタイムアウト、失敗時はgetSession()にフォールバック
  let user
  let networkError = false
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ]) as Awaited<ReturnType<typeof supabase.auth.getUser>>
    user = result.data.user
  } catch { networkError = true }

  if (!user) {
    try {
      const { data } = await supabase.auth.getSession()
      user = data.session?.user ?? null
    } catch { /* session fetch also failed */ }
  }

  // ネットワークエラーで両方失敗した場合はログイン画面に飛ばさない
  if (!user && !networkError) redirect('/auth/login')
  if (!user) return (
    <div className="min-h-screen warm-bg flex items-center justify-center">
      <p className="text-[var(--color-text-muted)] text-sm">接続エラーが発生しました。ページを再読み込みしてください。</p>
    </div>
  )

  const { data: profile } = await supabase
    .from('profiles').select('role, display_name').eq('id', user.id).single()

  if (!profile || profile.role !== 'admin') {
    redirect('/characters')
  }

  // unreadカウントはservice roleで（RLSオーバーヘッドなし）
  const adminDb = createAdminClient()
  const { count: unread } = await adminDb
    .from('conversations').select('id', { count: 'exact', head: true }).eq('is_unread_staff', true)

  const navItems = [
    { href: '/admin', label: '概要' },
    { href: '/admin/conversations', label: `受信トレイ${(unread ?? 0) > 0 ? ` (${unread})` : ''}` },
    { href: '/admin/conversations/search', label: 'やり取り検索' },
    { href: '/admin/users', label: 'ユーザー' },
    { href: '/admin/characters', label: 'キャラ管理' },
    { href: '/admin/auto-broadcast-schedule', label: '同報スケジュール' },
    { href: '/admin/items', label: 'アイテム' },
    { href: '/admin/videos', label: '動画販売' },
    { href: '/admin/opegra', label: 'オペグラ' },
    { href: '/admin/analytics', label: '集計' },
    { href: '/admin/training', label: 'AI学習データ' },
    { href: '/admin/inquiries', label: 'お問い合わせ' },
  ]

  return (
    <div className="min-h-screen warm-bg admin-layout">
      <header className="glass" style={{ position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="w-full px-4 flex items-center gap-4 h-12">
          <span className="text-sm font-medium text-[var(--color-text-warm)] shrink-0">AiKano</span>
          <span className="text-[var(--color-border-warm)] text-xs shrink-0 hidden md:block">|</span>
          <AdminNav navItems={navItems} />
        </div>
      </header>

      <RealtimeRefresher />
      <main className="w-full px-4 py-5">
        {children}
      </main>
    </div>
  )
}
