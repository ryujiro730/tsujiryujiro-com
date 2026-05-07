import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Download, MessageSquare, Bot } from 'lucide-react'
import Link from 'next/link'

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export default async function TrainingDataPage() {
  const admin = adminSupabase()

  const [
    { count: totalRows },
    { data: byCharacter },
    { data: recentRows },
  ] = await Promise.all([
    admin.from('training_data').select('id', { count: 'exact', head: true }),
    admin
      .from('training_data')
      .select('character_id, message_count, characters(name, avatar_url)')
      .order('message_count', { ascending: false }),
    admin
      .from('training_data')
      .select('conversation_id, message_count, updated_at, characters(name, avatar_url)')
      .order('updated_at', { ascending: false })
      .limit(10),
  ])

  // キャラクターごとの集計
  const charStats = new Map<string, { name: string; avatar: string; convCount: number; msgCount: number }>()
  for (const row of byCharacter ?? []) {
    const char = row.characters as any
    if (!char || !row.character_id) continue
    const existing = charStats.get(row.character_id)
    if (existing) {
      existing.convCount += 1
      existing.msgCount += row.message_count
    } else {
      charStats.set(row.character_id, {
        name: char.name,
        avatar: char.avatar_url,
        convCount: 1,
        msgCount: row.message_count,
      })
    }
  }

  const totalMessages = (byCharacter ?? []).reduce((sum, r) => sum + (r.message_count ?? 0), 0)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">AI学習データ</h1>
        <p className="text-[var(--color-text-muted)] text-sm">
          会話データが自動的に蓄積されます。JSONL形式でダウンロードしてLLMのファインチューニングに使用できます。
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="glass rounded-2xl p-5">
          <MessageSquare size={20} className="text-[var(--color-primary-light)] mb-3" />
          <div className="text-3xl font-bold mb-1">{totalRows ?? 0}</div>
          <div className="text-[var(--color-text-muted)] text-xs">保存済み会話数</div>
        </div>
        <div className="glass rounded-2xl p-5">
          <Bot size={20} className="text-[var(--color-accent)] mb-3" />
          <div className="text-3xl font-bold mb-1">{totalMessages.toLocaleString()}</div>
          <div className="text-[var(--color-text-muted)] text-xs">総メッセージ数</div>
        </div>
      </div>

      {/* 全データエクスポート */}
      <div className="glass rounded-2xl p-6 mb-8">
        <h2 className="font-semibold text-base mb-3">全データをエクスポート</h2>
        <p className="text-[var(--color-text-muted)] text-sm mb-4">
          全キャラクターの会話データをJSONL形式でダウンロードします。
          各行がひとつの会話（system prompt + 会話履歴）です。
        </p>
        <a
          href="/api/admin/training-export"
          download
          className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm"
        >
          <Download size={16} />
          全データをダウンロード (.jsonl)
        </a>
      </div>

      {/* キャラクター別 */}
      <h2 className="font-semibold text-base mb-4">キャラクター別</h2>
      <div className="space-y-3 mb-8">
        {Array.from(charStats.entries()).map(([charId, stat]) => (
          <div key={charId} className="glass rounded-xl px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-[var(--color-border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={stat.avatar} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="text-sm font-medium">{stat.name}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {stat.convCount}会話 / {stat.msgCount.toLocaleString()}メッセージ
                  </div>
                </div>
              </div>
              <a
                href={`/api/admin/training-export?character_id=${charId}`}
                download
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary-light)] transition-colors"
              >
                <Download size={13} />
                DL
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* 最近更新された会話 */}
      <h2 className="font-semibold text-base mb-4">最近更新された会話</h2>
      <div className="space-y-2">
        {(recentRows ?? []).map((row: any) => (
          <div key={row.conversation_id} className="glass rounded-xl px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full overflow-hidden border border-[var(--color-border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={row.characters?.avatar_url} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="text-sm">{row.characters?.name}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">{row.message_count}件のメッセージ</div>
                </div>
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">
                {new Date(row.updated_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
