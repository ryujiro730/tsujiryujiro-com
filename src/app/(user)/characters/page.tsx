import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function CharactersPage() {
  const supabase = createClient()

  const { data: characters } = await supabase
    .from('characters')
    .select('id, name, age, description, personality, avatar_url')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  return (
    <div>
      <div className="mb-7 pt-1">
        <h1 className="text-xl font-bold mb-1">誰に話しかけますか？</h1>
        <p className="text-[var(--color-text-muted)] text-sm">
          好きな子を選んで、今すぐ話しかけてみましょう。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        {characters?.map((char) => (
          <div
            key={char.id}
            className="card"
            style={{
              padding: '20px 14px', textAlign: 'center',
              position: 'relative', overflow: 'hidden',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              height: '100%',
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

            {/* アバター → 詳細ページへ */}
            <Link href={`/characters/${char.id}`}>
              <div style={{
                width: '68px', height: '68px', borderRadius: '50%',
                overflow: 'hidden', margin: '0 auto 12px',
                border: '2px solid var(--color-primary)',
                boxShadow: '0 0 14px var(--color-primary-glow)',
                cursor: 'pointer',
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={char.avatar_url} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </Link>

            <Link href={`/characters/${char.id}`} style={{ textDecoration: 'none' }}>
              <p className="font-bold text-sm mb-0.5 hover:opacity-80 transition-opacity">{char.name}</p>
            </Link>
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>{char.age}歳</p>
            <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              {char.description.length > 35 ? char.description.slice(0, 35) + '…' : char.description}
            </p>

            {/* 話すボタン → チャットへ直接 */}
            <Link href={`/chat?character=${char.id}`} style={{ textDecoration: 'none' }}>
              <div
                className="btn-cta"
                style={{
                  padding: '8px 0', fontSize: '13px', borderRadius: '8px',
                  textAlign: 'center', width: '100%',
                }}
              >
                話す ♡
              </div>
            </Link>
          </div>
        ))}
      </div>

      {(!characters || characters.length === 0) && (
        <div className="card p-10 text-center">
          <p className="text-[var(--color-text-muted)] text-sm">準備中です</p>
        </div>
      )}
    </div>
  )
}
