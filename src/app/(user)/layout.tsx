import Link from 'next/link'
import { MessageCircle, Users, Settings, ShoppingBag } from 'lucide-react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
export default async function UserLayout({ children }: { children: React.ReactNode }) {
  noStore()
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // RLSを回避してプロフィールを確実に取得
  let profile: { display_name: string | null; age: number | null } | null = null
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('profiles')
      .select('display_name, age')
      .eq('id', user.id)
      .single()
    profile = data
  } catch {}

  // age未設定ならオンボーディングへ（profile取得失敗時はループ防止のため通す）
  if (profile && profile.age === null) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen warm-bg">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass">
        <div className="max-w-2xl mx-auto px-4 h-13 flex items-center justify-between" style={{ height: '52px' }}>
          <Link href="/characters" className="text-sm font-medium text-[var(--color-text-warm)]">
            LoveChat
          </Link>
          <nav className="flex items-center gap-0.5">
            <Link href="/characters" className="p-2.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors">
              <Users size={17} className="text-[var(--color-text-muted)]" />
            </Link>
            <Link href="/conversations" className="p-2.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors">
              <MessageCircle size={17} className="text-[var(--color-text-muted)]" />
            </Link>
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
