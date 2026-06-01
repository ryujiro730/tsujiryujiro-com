import { createClient, createAdminClientStatic } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RealtimeRefresher from './conversations/RealtimeRefresher'
import { unstable_cache } from 'next/cache'
import { AdminNav } from '@/components/admin/AdminNav'

// roleチェックは30秒キャッシュ（cookies不要なstaticクライアントを使用）
const getAdminProfile = unstable_cache(
  async (userId: string) => {
    const adminDb = createAdminClientStatic()
    const { data } = await adminDb
      .from('profiles').select('role, display_name').eq('id', userId).single()
    return data
  },
  ['admin-profile'],
  { revalidate: 30 }
)

// unreadカウントは5秒キャッシュ
const getUnreadCount = unstable_cache(
  async () => {
    const adminDb = createAdminClientStatic()
    const { count } = await adminDb
      .from('conversations').select('id', { count: 'exact', head: true }).eq('is_unread_staff', true)
    return count ?? 0
  },
  ['admin-unread-count'],
  { revalidate: 5 }
)

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // getSession() はクッキー読み取りのみ（ネットワーク不要）→ 高速
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null

  if (!user) redirect('/auth/login')

  // roleチェックとunreadを並列取得（どちらもキャッシュ済みなら即座）
  const [profile, unread] = await Promise.all([
    getAdminProfile(user.id),
    getUnreadCount(),
  ])

  if (!profile || profile.role !== 'admin') {
    redirect('/characters')
  }

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
    <div className="min-h-screen admin-layout" style={{ background: 'var(--color-bg)' }}>
      <header className="glass" style={{ position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="w-full px-4 flex items-center gap-4 h-12">
          <a href="/characters" className="text-sm font-semibold text-[var(--color-text)] shrink-0 hover:opacity-70 transition-opacity">AiKano</a>
          <span className="text-[var(--color-text-muted)] text-xs shrink-0 hidden md:block">|</span>
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
