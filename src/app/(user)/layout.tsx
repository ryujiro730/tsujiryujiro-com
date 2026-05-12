import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}
import { MessageCircle, Users, Settings, ShoppingBag } from 'lucide-react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { Suspense } from 'react'
import { PointsDisplay } from '@/components/PointsDisplay'

// Separate async component for unread count (non-blocking)
async function UnreadBadge({ userId }: { userId: string }) {
  const admin = createAdminClient()

  const { data: convData } = await admin
    .from('conversations')
    .select('id')
    .eq('user_id', userId)

  let unreadCount = 0
  const convIds = (convData ?? []).map((c: { id: string }) => c.id)

  if (convIds.length > 0) {
    const { data: unreadMsgs } = await admin
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', convIds)
      .eq('sender_role', 'character')
      .eq('is_read', false)

    const unreadConvIds = Array.from(new Set((unreadMsgs ?? []).map((m: { conversation_id: string }) => m.conversation_id)))

    if (unreadConvIds.length > 0) {
      const { data: latestMsgs } = await admin
        .from('messages')
        .select('conversation_id, sender_role')
        .in('conversation_id', unreadConvIds)
        .order('created_at', { ascending: false })

      const latestByConv = new Map<string, string>()
      for (const msg of latestMsgs ?? []) {
        const m = msg as { conversation_id: string; sender_role: string }
        if (!latestByConv.has(m.conversation_id)) {
          latestByConv.set(m.conversation_id, m.sender_role)
        }
      }
      unreadCount = Array.from(latestByConv.values()).filter(role => role === 'character').length
    }
  }

  if (unreadCount === 0) return (
    <Link href="/conversations" className="p-2.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors">
      <MessageCircle size={17} className="text-[var(--color-text-muted)]" />
    </Link>
  )

  return (
    <Link href="/conversations" className="relative p-2.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors">
      <MessageCircle size={17} style={{ color: 'var(--color-primary)' }} />
      <span
        className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[10px] text-white font-bold px-0.5"
        style={{ background: 'var(--color-primary)', lineHeight: 1 }}
      >
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    </Link>
  )
}

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  noStore()
  const supabase = createClient()

  // getSession() reads from cookie — no network call
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')
  const userId = session.user.id

  const admin = createAdminClient()

  // Only 1 DB query blocks the critical path
  const { data: profile } = await admin
    .from('profiles')
    .select('display_name, age, points')
    .eq('id', userId)
    .single()

  if (profile && profile.age === null) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen warm-bg">
      <header className="fixed top-0 w-full z-50 glass">
        <div className="max-w-2xl mx-auto px-4 h-13 flex items-center justify-between" style={{ height: '52px' }}>
          <Link href="/characters" className="text-sm font-medium text-[var(--color-text-warm)]">
            AiKano
          </Link>
          <PointsDisplay initialPoints={profile?.points ?? 0} />
          <nav className="flex items-center gap-0.5">
            <Link href="/characters" className="p-2.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors">
              <Users size={17} className="text-[var(--color-text-muted)]" />
            </Link>
            {/* UnreadBadge loads async — doesn't block page render */}
            <Suspense fallback={
              <Link href="/conversations" className="p-2.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors">
                <MessageCircle size={17} className="text-[var(--color-text-muted)]" />
              </Link>
            }>
              <UnreadBadge userId={userId} />
            </Suspense>
            <Link href="/shop" className="p-2.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors">
              <ShoppingBag size={17} className="text-[var(--color-text-muted)]" />
            </Link>
            <Link href="/settings" className="p-2.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors">
              <Settings size={17} className="text-[var(--color-text-muted)]" />
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
