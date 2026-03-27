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
      <div className="mb-6 pt-2">
        <h1 className="text-xl font-bold mb-1">話し相手を選ぶ</h1>
        <p className="text-[var(--color-text-muted)] text-sm">
          キャラクターは違っても、返すのは同じ人間です。
        </p>
      </div>

      <div className="space-y-3">
        {characters?.map((char) => (
          <div key={char.id} className="card p-4">
            <div className="flex items-start gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-[60px] h-[60px] rounded-full overflow-hidden border border-[var(--color-border-warm)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={char.avatar_url} alt={char.name} className="w-full h-full object-cover" />
                </div>
                <span className="online-dot absolute bottom-0 right-0 border-2 border-[var(--color-bg)]" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-medium">{char.name}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">{char.age}歳</span>
                </div>
                <p className="text-[var(--color-text-muted)] text-sm leading-relaxed mb-1">
                  {char.description}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-accent)' }}>
                  {char.personality}
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Link
                href={`/chat?character=${char.id}`}
                className="btn-primary flex-1 py-2.5 text-sm text-center"
              >
                話しかける
              </Link>
            </div>
          </div>
        ))}
      </div>

      {(!characters || characters.length === 0) && (
        <div className="card p-10 text-center">
          <p className="text-[var(--color-text-muted)] text-sm">現在、話し相手は準備中です。</p>
        </div>
      )}
    </div>
  )
}
