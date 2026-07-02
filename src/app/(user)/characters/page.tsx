import Link from 'next/link'
import Image from 'next/image'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'

export default async function CharactersPage() {
  noStore()
  const supabase = createClient()
  const admin = createAdminClient()

  // Use getSession (no network) for userId
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id

  const [{ data: characters }, { data: convData }] = await Promise.all([
    supabase.from('characters').select('id, name, age, description, personality, avatar_url').eq('is_active', true).order('sort_order', { ascending: true }),
    userId ? admin.from('conversations').select('id, character_id').eq('user_id', userId) : Promise.resolve({ data: [] }),
  ])

  // ユーザーがいれば未読カウントをキャラごとに取得
  const unreadByChar = new Map<string, number>()
  if (userId && convData && convData.length > 0) {
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

      const latestByConv = new Map<string, string>()
      for (const msg of latestMsgs ?? []) {
        const m = msg as { conversation_id: string; sender_role: string }
        if (!latestByConv.has(m.conversation_id)) {
          latestByConv.set(m.conversation_id, m.sender_role)
        }
      }

      // 最新メッセージがキャラ（未返信）の会話だけキャラ別にカウント
      latestByConv.forEach((role, convId) => {
        if (role === 'character') {
          const conv = (convData as { id: string; character_id: string }[]).find(c => c.id === convId)
          if (conv) {
            unreadByChar.set(conv.character_id, (unreadByChar.get(conv.character_id) ?? 0) + 1)
          }
        }
      })
    }
  }

  return (
    <div>
      <div className="mb-7 pt-1">
        <h1 className="text-xl font-bold mb-1">誰に話しかけますか？</h1>
        <p className="text-[var(--color-text-muted)] text-sm">
          好きな子を選んで、今すぐ話しかけてみましょう。
        </p>
      </div>


      <div className="grid grid-cols-2 gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        {characters?.map((char) => {
          const unread = unreadByChar.get(char.id) ?? 0
          return (
            <div
              key={char.id}
              className="card"
              style={{
                padding: '20px 14px', textAlign: 'center',
                position: 'relative', overflow: 'hidden',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                height: '100%',
                ...(unread > 0 ? {
                  borderColor: 'var(--color-primary)',
                  boxShadow: '0 0 18px var(--color-primary-glow)',
                } : {}),
              }}
            >
              {/* オンラインバッジ */}
              <div style={{
                position: 'absolute', top: '10px', right: '10px',
                background: 'rgba(126,200,80,0.15)',
                border: '1px solid rgba(126,200,80,0.35)',
                borderRadius: '99px', padding: '2px 7px',
                fontSize: '10px', color: '#7ec850', fontWeight: 600,
              }}>
                ● ON
              </div>

              {/* アバター */}
              <Link href={`/characters/${char.id}`}>
                <div style={{ position: 'relative', width: '68px', margin: '0 auto 12px' }}>
                  <div style={{
                    width: '68px', height: '68px', borderRadius: '50%',
                    overflow: 'hidden',
                    border: unread > 0 ? '2.5px solid var(--color-primary)' : '2px solid var(--color-primary)',
                    boxShadow: unread > 0 ? '0 0 20px var(--color-primary-glow)' : '0 0 14px var(--color-primary-glow)',
                    cursor: 'pointer',
                    animation: unread > 0 ? 'pulse-border 2s ease-in-out infinite' : 'none',
                  }}>
                    <Image src={char.avatar_url} alt={char.name} width={68} height={68} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  {/* 未読バッジ */}
                  {unread > 0 && (
                    <span style={{
                      position: 'absolute', top: '-4px', right: '-4px',
                      minWidth: '20px', height: '20px',
                      background: 'var(--color-primary)',
                      borderRadius: '99px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', color: '#fff', fontWeight: 700, padding: '0 4px',
                      boxShadow: '0 1px 6px rgba(232,121,160,0.6)',
                    }}>
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </div>
              </Link>

              <Link href={`/characters/${char.id}`} style={{ textDecoration: 'none' }}>
                <p className="font-bold text-sm mb-0.5 hover:opacity-80 transition-opacity">{char.name}</p>
              </Link>
              <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>{char.age}歳</p>

              {unread > 0 ? (
                <p className="text-xs mb-3 font-semibold" style={{ color: 'var(--color-primary)' }}>
                  📩 メッセージあり
                </p>
              ) : (
                <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  {char.description.length > 35 ? char.description.slice(0, 35) + '…' : char.description}
                </p>
              )}

              {/* 話すボタン */}
              <Link href={`/chat?character=${char.id}`} style={{ textDecoration: 'none' }}>
                <div
                  className="btn-cta"
                  style={{
                    padding: '8px 0', fontSize: '13px', borderRadius: '8px',
                    textAlign: 'center', width: '100%',
                  }}
                >
                  {unread > 0 ? '返信する ♡' : '話す ♡'}
                </div>
              </Link>
            </div>
          )
        })}
      </div>

      {(!characters || characters.length === 0) && (
        <div className="card p-10 text-center">
          <p className="text-[var(--color-text-muted)] text-sm">準備中です</p>
        </div>
      )}
    </div>
  )
}
