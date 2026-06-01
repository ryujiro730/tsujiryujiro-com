import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { Suspense } from 'react'
import { PointsDisplay } from '@/components/PointsDisplay'
import { BottomNav } from '@/components/BottomNav'
import { BottomNavServer } from '@/components/BottomNavServer'
import { LoginBonusDialog } from '@/components/LoginBonusDialog'


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
    .select('display_name, age, points, bonus_points, bonus_points_expires_at, role')
    .eq('id', userId)
    .single()

  if (!profile || profile.age === null) {
    redirect('/onboarding')
  }


  return (
    <div className="min-h-screen warm-bg">
      <header className="fixed top-0 w-full z-50 glass">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between" style={{ height: '52px' }}>
          <Link href="/characters" className="text-sm font-semibold tracking-wide" style={{ color: 'var(--color-text-warm)' }}>
            AiKano
          </Link>
          <div className="flex items-center gap-3">
            {profile?.role === 'admin' && (
              <a href="/admin" className="text-xs text-[var(--color-text-muted)] hover:opacity-70 transition-opacity">
                管理画面 →
              </a>
            )}
            <PointsDisplay initialPoints={(profile?.points ?? 0) + (profile?.bonus_points ?? 0)} />
          </div>
        </div>
      </header>

      <main className="pt-[52px] pb-[72px] max-w-2xl mx-auto px-4 py-5">
        {children}
      </main>

      <LoginBonusDialog />

      {/* ボトムナビ: unreadCountをSuspenseで非ブロッキングにストリーム */}
      <Suspense fallback={<BottomNav unreadCount={0} />}>
        <BottomNavServer userId={userId} />
      </Suspense>
    </div>
  )
}
