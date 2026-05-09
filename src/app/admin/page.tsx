import { createAdminClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'
import Link from 'next/link'
import { Inbox, Users, MessageCircle, TrendingUp } from 'lucide-react'

export default async function AdminDashboard() {
  noStore()
  const supabase = createAdminClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    { count: unreadCount },
    { count: totalUsers },
    { count: todayMessages },
    { count: totalConversations },
    { data: recentConvs },
  ] = await Promise.all([
    supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('is_unread_staff', true),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'user'),
    supabase.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    supabase.from('conversations').select('id', { count: 'exact', head: true }),
    supabase.from('conversations')
      .select('id, last_message_at, is_unread_staff, characters(name, avatar_url), profiles(display_name)')
      .order('last_message_at', { ascending: false })
      .limit(5),
  ])

  const stats = [
    { label: '未読メッセージ', value: unreadCount ?? 0, icon: Inbox, color: 'text-red-400', urgent: (unreadCount ?? 0) > 0 },
    { label: '今日のメッセージ', value: todayMessages ?? 0, icon: MessageCircle, color: 'text-[var(--color-primary-light)]', urgent: false },
    { label: '総ユーザー数', value: totalUsers ?? 0, icon: Users, color: 'text-[var(--color-accent)]', urgent: false },
    { label: '総会話数', value: totalConversations ?? 0, icon: TrendingUp, color: 'text-purple-400', urgent: false },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">ダッシュボード</h1>
        <p className="text-[var(--color-text-muted)] text-sm">AiKano 管理画面</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`glass rounded-2xl p-5 ${stat.urgent ? 'border-red-500/50 ring-1 ring-red-500/20' : ''}`}
          >
            <stat.icon size={20} className={`${stat.color} mb-3`} />
            <div className="text-3xl font-bold mb-1">{stat.value}</div>
            <div className="text-[var(--color-text-muted)] text-xs">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      {(unreadCount ?? 0) > 0 && (
        <Link
          href="/admin/conversations"
          className="block glass rounded-2xl p-5 mb-8 border-[var(--color-primary)]/50 hover:border-[var(--color-primary)] transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold mb-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse inline-block" />
                未返信メッセージがあります
              </div>
              <div className="text-[var(--color-text-muted)] text-sm">
                {unreadCount}件の未読メッセージに返信してください
              </div>
            </div>
            <div className="btn-primary px-4 py-2 text-sm">返信する →</div>
          </div>
        </Link>
      )}

      {/* Recent conversations */}
      <h2 className="font-semibold text-base mb-4">最近の会話</h2>
      <div className="space-y-2">
        {recentConvs?.map((conv: any) => (
          <Link
            key={conv.id}
            href={`/admin/conversations/${conv.id}`}
            className="block glass rounded-xl px-4 py-3 hover:border-[var(--color-primary-light)]/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-[var(--color-border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={conv.characters?.avatar_url} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="text-sm font-medium flex items-center gap-2">
                    {conv.profiles?.display_name ?? '匿名'}
                    {conv.is_unread_staff && (
                      <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                    )}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {conv.characters?.name}宛
                  </div>
                </div>
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">
                {new Date(conv.last_message_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
