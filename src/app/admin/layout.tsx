import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, display_name').eq('id', user.id).single()

  if (!profile || profile.role !== 'admin') {
    redirect('/characters')
  }

  const { count: unread } = await supabase
    .from('conversations').select('id', { count: 'exact', head: true }).eq('is_unread_staff', true)

  const navItems = [
    { href: '/admin', label: '概要' },
    { href: '/admin/conversations', label: `受信トレイ${(unread ?? 0) > 0 ? ` (${unread})` : ''}` },
    { href: '/admin/users', label: 'ユーザー' },
    { href: '/admin/characters', label: 'キャラ管理' },
  ]

  return (
    <div className="min-h-screen warm-bg">
      <header className="glass px-5" style={{ position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="max-w-3xl mx-auto flex items-center gap-6 h-12">
          <span className="text-sm font-medium text-[var(--color-text-warm)]">HumanChat</span>
          <span className="text-[var(--color-border-warm)] text-xs">|</span>
          <nav className="flex items-center gap-1">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-6">
        {children}
      </main>
    </div>
  )
}
