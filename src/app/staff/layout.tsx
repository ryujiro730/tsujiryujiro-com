import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare, LayoutDashboard, LogOut } from 'lucide-react'

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single()

  // roleが取れない or staff/admin以外はキャラ一覧へ
  if (!profile || !['staff', 'admin'].includes(profile.role)) {
    redirect('/characters')
  }

  const { count } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('is_unread_staff', true)

  return (
    <div className="min-h-screen flex warm-bg">
      <aside className="w-56 fixed top-0 left-0 h-full glass border-r border-[var(--color-border)] flex flex-col z-40">
        <div className="px-5 py-5 border-b border-[var(--color-border)]">
          <p className="font-display text-xl text-[var(--color-primary)] tracking-widest">恋文</p>
          <p className="text-[var(--color-text-muted)] text-xs mt-0.5">スタッフ管理画面</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavItem href="/staff" icon={<LayoutDashboard size={16} />} label="ダッシュボード" />
          <NavItem
            href="/staff/conversations"
            icon={<MessageSquare size={16} />}
            label="チャット一覧"
            badge={count ?? undefined}
          />
        </nav>

        <div className="px-4 py-4 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-muted)] mb-0.5">ログイン中</p>
          <p className="text-sm truncate mb-2">{profile.display_name}</p>
          <form action="/api/auth/signout" method="post">
            <button className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] flex items-center gap-1 transition-colors w-full">
              <LogOut size={12} />
              ログアウト
            </button>
          </form>
        </div>
      </aside>

      <main className="ml-56 flex-1 p-6 min-h-screen">
        {children}
      </main>
    </div>
  )
}

function NavItem({
  href, icon, label, badge
}: {
  href: string
  icon: React.ReactNode
  label: string
  badge?: number
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-2)] transition-colors group"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors">
          {icon}
        </span>
        <span className="text-sm text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors">
          {label}
        </span>
      </div>
      {badge !== undefined && badge > 0 && (
        <span className="bg-[var(--color-primary)] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}
