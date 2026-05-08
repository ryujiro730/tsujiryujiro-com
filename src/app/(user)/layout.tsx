import Link from 'next/link'
import { MessageCircle, Users, Settings, ShoppingBag, Plus } from 'lucide-react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  noStore()
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()

  // RLSを回避してプロフィールを確実に取得
  let profile: { display_name: string | null; age: number | null; points: number } | null = null
  let unreadCount = 0
  try {
    const [{ data: profileData }, { data: convData }] = await Promise.all([
      admin.from('profiles').select('display_name, age, points').eq('id', user.id).single(),
      admin.from('conversations').select('id').eq('user_id', user.id),
    ])
    profile = profileData

    if (convData && convData.length > 0) {
      const convIds = convData.map((c: { id: string }) => c.id)

      // 未読キャラメッセージがある会話IDを取得
      const { data: unreadMsgs } = await admin
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', convIds)
        .eq('sender_role', 'character')
        .eq('is_read', false)

      const unreadConvIds = Array.from(new Set((unreadMsgs ?? []).map((m: { conversation_id: string }) => m.conversation_id)))

      if (unreadConvIds.length > 0) {
        // その会話の最新メッセージを取得（ユーザーが返信済みか確認）
        const { data: latestMsgs } = await admin
          .from('messages')
          .select('conversation_id, sender_role')
          .in('conversation_id', unreadConvIds)
          .order('created_at', { ascending: false })

        // 会話ごとの最新送信者を記録
        const latestByConv = new Map<string, string>()
        for (const msg of latestMsgs ?? []) {
          const m = msg as { conversation_id: string; sender_role: string }
          if (!latestByConv.has(m.conversation_id)) {
            latestByConv.set(m.conversation_id, m.sender_role)
          }
        }

        // 最新メッセージがキャラ（＝ユーザー未返信）の会話数
        unreadCount = Array.from(latestByConv.values()).filter(role => role === 'character').length
      }
    }
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
          {/* ポイント残高＋購入ボタン */}
          <Link
            href="/payment"
            className="flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors hover:opacity-80"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-warm)' }}
          >
            <span className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>
              {(profile?.points ?? 0).toLocaleString()}
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)]">pt</span>
            <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center ml-0.5"
              style={{ background: 'var(--color-primary)' }}>
              <Plus size={9} color="#fff" strokeWidth={3} />
            </div>
          </Link>
          <nav className="flex items-center gap-0.5">
            <Link href="/characters" className="p-2.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors">
              <Users size={17} className="text-[var(--color-text-muted)]" />
            </Link>
            {/* メッセージアイコン — 未読バッジ付き */}
            <Link href="/conversations" className="relative p-2.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors">
              <MessageCircle size={17} className={unreadCount > 0 ? '' : 'text-[var(--color-text-muted)]'}
                style={unreadCount > 0 ? { color: 'var(--color-primary)' } : {}} />
              {unreadCount > 0 && (
                <span
                  className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[10px] text-white font-bold px-0.5"
                  style={{ background: 'var(--color-primary)', lineHeight: 1 }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
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
