import { createClient } from '@/lib/supabase/server'
import { MessageSquare, Users, Coins, TrendingUp } from 'lucide-react'

export default async function StaffDashboard() {
  const supabase = createClient()

  const [
    { count: totalUsers },
    { count: pendingConvs },
    { count: todayMessages },
    { data: recentMessages },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
    supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('is_unread_staff', true),
    supabase.from('messages').select('*', { count: 'exact', head: true })
      .eq('sender_role', 'user')
      .gte('created_at', new Date(Date.now() - 86400000).toISOString()),
    supabase.from('messages')
      .select('*, conversations(characters(name, avatar_url), profiles(display_name))')
      .eq('sender_role', 'user')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const stats = [
    { label: '未返信チャット', value: pendingConvs ?? 0, icon: <MessageSquare size={20} />, color: 'text-[var(--color-primary)]', urgent: (pendingConvs ?? 0) > 0 },
    { label: '今日のメッセージ', value: todayMessages ?? 0, icon: <TrendingUp size={20} />, color: 'text-green-400', urgent: false },
    { label: '総ユーザー数', value: totalUsers ?? 0, icon: <Users size={20} />, color: 'text-blue-400', urgent: false },
  ]

  return (
    <div className="animate-fade-in">
      <h1 className="font-display text-3xl mb-6">ダッシュボード</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div
            key={i}
            className={`glass rounded-2xl p-5 ${stat.urgent ? 'border-[var(--color-primary)] shadow-[var(--color-primary-glow)] shadow-md' : ''}`}
          >
            <div className={`mb-3 ${stat.color}`}>{stat.icon}</div>
            <p className="font-display text-4xl mb-1">{stat.value}</p>
            <p className="text-[var(--color-text-muted)] text-sm">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* 最近のメッセージ */}
      <div className="glass rounded-2xl p-5">
        <h2 className="font-display text-xl mb-4">最近のユーザーメッセージ</h2>
        {recentMessages && recentMessages.length > 0 ? (
          <div className="space-y-3">
            {recentMessages.map((msg: any) => (
              <div key={msg.id} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--color-surface-2)]">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate">
                      {msg.conversations?.profiles?.display_name ?? '不明'}
                    </span>
                    <span className="text-[var(--color-text-muted)] text-xs">→</span>
                    <span className="text-[var(--color-primary)] text-xs truncate">
                      {msg.conversations?.characters?.name ?? '不明'}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)] truncate">{msg.content}</p>
                </div>
                <span className="text-[var(--color-text-muted)] text-xs whitespace-nowrap">
                  {new Date(msg.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[var(--color-text-muted)] text-sm text-center py-6">
            メッセージはまだありません
          </p>
        )}
      </div>
    </div>
  )
}
