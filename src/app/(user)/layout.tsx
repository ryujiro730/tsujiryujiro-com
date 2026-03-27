import Link from 'next/link'
import { MessageCircle, Users, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FREE_MESSAGE_LIMIT } from '@/types'

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  let profile: { display_name: string | null; points: number; free_messages_used: number } | null = null
  try {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, points, free_messages_used')
      .eq('id', user.id)
      .single()
    profile = data
  } catch {}

  const freeLeft = Math.max(0, FREE_MESSAGE_LIMIT - (profile?.free_messages_used ?? 0))
  const tokens = profile?.points ?? 0

  return (
    <div className="min-h-screen warm-bg">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass">
        <div className="max-w-2xl mx-auto px-4 h-13 flex items-center justify-between" style={{ height: '52px' }}>
          <Link href="/characters" className="text-sm font-medium text-[var(--color-text-warm)]">
            HumanChat
          </Link>
          <nav className="flex items-center gap-0.5">
            <Link href="/characters" className="p-2.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors">
              <Users size={17} className="text-[var(--color-text-muted)]" />
            </Link>
            <Link href="/conversations" className="p-2.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors">
              <MessageCircle size={17} className="text-[var(--color-text-muted)]" />
            </Link>
            <Link href="/settings" className="p-2.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors">
              <Settings size={17} className="text-[var(--color-text-muted)]" />
            </Link>
            <Link
              href="/payment"
              className="ml-1 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs text-[var(--color-accent)] font-medium"
            >
              {freeLeft > 0 ? `残り無料${freeLeft}通` : `${tokens}T`}
            </Link>
          </nav>
        </div>
      </header>

      <main className="pt-[52px] max-w-2xl mx-auto px-4 py-5">
        {children}
      </main>
    </div>
  )
}
