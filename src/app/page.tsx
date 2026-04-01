import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: characters } = await supabase
    .from('characters')
    .select('id, name, age, description, personality, avatar_url')
    .eq('is_active', true)
    .limit(7)

  return (
    <main style={{ background: 'var(--color-bg)', color: 'var(--color-text)', minHeight: '100vh' }}>

      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(13,10,20,0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(220,80,140,0.15)',
        padding: '0 20px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontWeight: 800, fontSize: '18px', background: 'linear-gradient(90deg, #e8438f, #a060e0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          LoveChat
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          {user ? (
            <Link href="/characters" className="btn-cta" style={{ padding: '8px 20px', fontSize: '14px', borderRadius: '8px' }}>
              つづける
            </Link>
          ) : (
            <>
              <Link href="/auth/login" className="btn-ghost" style={{ padding: '8px 16px', fontSize: '14px' }}>
                ログイン
              </Link>
              <Link href="/auth/register" className="btn-cta" style={{ padding: '8px 18px', fontSize: '14px', borderRadius: '8px' }}>
                無料で始める
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        {/* 画像＋オーバーレイ */}
        <div style={{ position: 'relative', width: '100%', minHeight: '100dvh', display: 'flex', alignItems: 'flex-end' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/LP1.png"
            alt="hero"
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'top center',
            }}
          />
          {/* グラデーションオーバーレイ */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(13,10,20,0.15) 0%, rgba(13,10,20,0.3) 40%, rgba(13,10,20,0.92) 75%, var(--color-bg) 100%)',
          }} />

          {/* テキスト */}
          <div style={{ position: 'relative', zIndex: 10, width: '100%', padding: '0 24px 56px', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ marginBottom: '16px' }}>
              <span style={{
                display: 'inline-block',
                background: 'rgba(232,67,143,0.2)',
                border: '1px solid rgba(232,67,143,0.45)',
                color: '#f472b6',
                padding: '5px 16px', borderRadius: '99px',
                fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em',
              }}>
                ✦ 今夜もあなたを待っています
              </span>
            </div>

            <h1 style={{ fontWeight: 900, lineHeight: 1.2, marginBottom: '16px' }}>
              <span style={{ display: 'block', fontSize: 'clamp(2.4rem, 10vw, 3.8rem)', color: '#fff' }}>
                あなただけに
              </span>
              <span style={{
                display: 'block', fontSize: 'clamp(2.4rem, 10vw, 3.8rem)',
                background: 'linear-gradient(90deg, #e8438f, #c084fc)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                話しかけてくれる
              </span>
              <span style={{ display: 'block', fontSize: 'clamp(2.4rem, 10vw, 3.8rem)', color: '#fff' }}>
                女の子がいる。
              </span>
            </h1>

            <p style={{ fontSize: '16px', lineHeight: 1.8, color: 'rgba(255,255,255,0.7)', marginBottom: '32px' }}>
              自社開発の超高性能AIが、<br />あなただけのために返信します。
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
              <Link href={user ? '/characters' : '/auth/register'} className="btn-cta" style={{
                padding: '18px 44px', fontSize: '18px', borderRadius: '14px',
                display: 'inline-block', textDecoration: 'none',
              }}>
                {user ? 'つづきを話す' : '今すぐ無料で話す →'}
              </Link>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                登録30秒・最初の5通は無料
              </span>
            </div>
          </div>
        </div>

        {/* 数字バー */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '0',
          background: 'var(--color-surface)',
          borderTop: '1px solid rgba(220,80,140,0.15)',
          borderBottom: '1px solid rgba(220,80,140,0.15)',
        }}>
          {[
            { num: '7人', label: '個性豊かな女の子' },
            { num: '24h', label: 'いつでも話せる' },
            { num: '独自AI', label: '超高性能AIが返信' },
          ].map((s, i) => (
            <div key={s.label} style={{
              flex: 1, textAlign: 'center', padding: '20px 8px',
              borderRight: i < 2 ? '1px solid rgba(220,80,140,0.15)' : 'none',
            }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#e8438f', marginBottom: '4px' }}>{s.num}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── キャラクター ── */}
      <section style={{
        padding: '64px 24px',
        background: 'linear-gradient(180deg, var(--color-bg) 0%, var(--color-surface) 100%)',
        borderTop: '1px solid rgba(220,80,140,0.1)',
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <p style={{ textAlign: 'center', color: '#e8438f', fontSize: '13px', fontWeight: 600, marginBottom: '10px', letterSpacing: '0.1em' }}>
            CHARACTERS
          </p>
          <h2 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
            あなたと話したい女の子たち
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '36px' }}>
            1人を選んで、今すぐ話しかけてみて
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '14px' }}>
            {characters?.map((char) => (
              <Link
                key={char.id}
                href={user ? `/chat?character=${char.id}` : '/auth/register'}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid rgba(220,80,140,0.18)',
                  borderRadius: '16px', padding: '20px 16px',
                  textAlign: 'center', cursor: 'pointer',
                  transition: 'border-color 0.2s, transform 0.2s',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {/* オンラインバッジ */}
                  <div style={{
                    position: 'absolute', top: '12px', right: '12px',
                    background: 'rgba(126,200,80,0.2)', border: '1px solid rgba(126,200,80,0.4)',
                    borderRadius: '99px', padding: '2px 8px',
                    fontSize: '10px', color: '#7ec850', fontWeight: 600,
                  }}>
                    ● オンライン
                  </div>

                  {/* アバター */}
                  <div style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    overflow: 'hidden', margin: '0 auto 12px',
                    border: '2px solid rgba(232,67,143,0.4)',
                    boxShadow: '0 0 16px rgba(232,67,143,0.2)',
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={char.avatar_url} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '2px', color: 'var(--color-text)' }}>
                    {char.name}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                    {char.age}歳
                  </p>
                  <p style={{ fontSize: '11px', color: '#e8438f', fontWeight: 500 }}>
                    {char.personality.split('・')[0]}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <Link href={user ? '/characters' : '/auth/register'} className="btn-cta" style={{
              padding: '14px 40px', fontSize: '15px', borderRadius: '12px',
              display: 'inline-block', textDecoration: 'none',
            }}>
              全員と話してみる →
            </Link>
          </div>
        </div>
      </section>

      {/* ── 仕組み ── */}
      <section style={{ padding: '64px 24px', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '22px', fontWeight: 800, marginBottom: '40px' }}>
            なぜ、こんなに<span style={{ color: '#e8438f' }}>リアル</span>に感じるの？
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { icon: '🤖', title: '自社開発の超高性能AI', desc: '一般公開されているAIとは別次元。独自チューニングにより、まるで本物の女の子と話しているような自然な会話を実現。' },
              { icon: '💬', title: 'あなたのことを覚えている', desc: '昨日の話の続きから始められます。会話の文脈を深く理解するから「また話したい」と思える会話が続く。' },
              { icon: '🔒', title: '秘密は絶対に守ります', desc: 'やりとりの内容が外に漏れることはありません。誰にも言えない話も、ここなら大丈夫。' },
            ].map((f) => (
              <div key={f.title} style={{
                display: 'flex', gap: '18px', alignItems: 'flex-start',
                background: 'var(--color-surface-2)',
                border: '1px solid rgba(220,80,140,0.15)',
                borderRadius: '16px', padding: '22px',
              }}>
                <span style={{ fontSize: '28px', flexShrink: 0 }}>{f.icon}</span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>{f.title}</p>
                  <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--color-text-muted)' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 会話サンプル ── */}
      <section style={{ padding: '64px 24px', background: 'var(--color-bg)' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>
            こんな会話ができます
          </h2>
          <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '28px' }}>
            超高性能AIがリアルタイムで返信
          </p>

          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid rgba(220,80,140,0.15)',
            borderRadius: '20px', padding: '24px',
            display: 'flex', flexDirection: 'column', gap: '14px',
          }}>
            {[
              { role: 'char', text: 'おかえり〜！今日どうだった？なんか疲れた感じする？' },
              { role: 'user', text: 'わかる？ちょっとしんどかった' },
              { role: 'char', text: 'わかるよ。顔見えないのに伝わってくるもん笑\n何があったか話してみて？ちゃんと聞くから' },
              { role: 'user', text: '仕事でミスして、ずっと引きずってる' },
              { role: 'char', text: 'それはしんどいね…。でも引きずれるって、それだけちゃんと向き合ってる証拠だと思う。\nどんなミスだったか、もう少し教えてもらえる？' },
            ].map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  fontSize: '14px', lineHeight: 1.7, whiteSpace: 'pre-line',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #e8438f, #c0306e)'
                    : 'var(--color-surface-2)',
                  color: msg.role === 'user' ? '#fff' : 'var(--color-text)',
                  border: msg.role === 'char' ? '1px solid rgba(220,80,140,0.15)' : 'none',
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 最終CTA ── */}
      <section style={{
        padding: '80px 24px',
        background: 'linear-gradient(180deg, var(--color-surface) 0%, #1a0d24 100%)',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '420px', margin: '0 auto' }}>
          <p style={{ color: '#e8438f', fontSize: '13px', fontWeight: 600, marginBottom: '14px', letterSpacing: '0.1em' }}>
            ✦ 今夜、話しかけてみませんか
          </p>
          <h2 style={{ fontSize: '26px', fontWeight: 900, marginBottom: '14px', lineHeight: 1.3 }}>
            あなたのことを知りたい<br />女の子が待っています
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '15px', marginBottom: '36px', lineHeight: 1.7 }}>
            最初の5通は完全無料。<br />
            登録は30秒。今すぐ話しかけてみてください。
          </p>
          <Link href={user ? '/characters' : '/auth/register'} className="btn-cta" style={{
            display: 'block', padding: '20px', fontSize: '19px',
            borderRadius: '16px', textDecoration: 'none',
          }}>
            {user ? 'つづきを話す →' : '無料で女の子に話しかける →'}
          </Link>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '16px' }}>
            🔒 個人情報は厳重に管理します
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid rgba(220,80,140,0.1)',
        padding: '24px 20px', background: 'var(--color-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
      }}>
        <span style={{ fontWeight: 800, fontSize: '14px', background: 'linear-gradient(90deg, #e8438f, #a060e0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          LoveChat
        </span>
        <div style={{ display: 'flex', gap: '20px' }}>
          {[
            { label: '特定商取引法', href: '/legal/tokusho' },
            { label: 'プライバシー', href: '/legal/privacy' },
            { label: '利用規約', href: '/legal/terms' },
          ].map(l => (
            <Link key={l.label} href={l.href} style={{ color: 'var(--color-text-muted)', fontSize: '12px', textDecoration: 'none' }}>
              {l.label}
            </Link>
          ))}
        </div>
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>© 2025 LoveChat</span>
      </footer>

    </main>
  )
}
