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

  const ctaHref = user ? '/characters' : '/auth/register'
  const ctaText = user ? 'つづきを話す →' : '今すぐ無料で話す →'

  return (
    <main style={{ background: 'var(--color-bg)', color: 'var(--color-text)', minHeight: '100vh' }}>

      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(13,10,20,0.9)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(220,80,140,0.15)',
        padding: '0 20px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontWeight: 800, fontSize: '18px', background: 'linear-gradient(90deg, #e8438f, #a060e0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          LoveChat
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          {user ? (
            <Link href="/characters" className="btn-cta" style={{ padding: '8px 20px', fontSize: '14px', borderRadius: '8px' }}>つづける</Link>
          ) : (
            <>
              <Link href="/auth/login" className="btn-ghost" style={{ padding: '8px 16px', fontSize: '14px' }}>ログイン</Link>
              <Link href="/auth/register" className="btn-cta" style={{ padding: '8px 18px', fontSize: '14px', borderRadius: '8px' }}>無料で始める</Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero（フルスクリーン写真） ── */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', width: '100%', minHeight: '100dvh', display: 'flex', alignItems: 'flex-end' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/LP1.png" alt="hero" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(13,10,20,0.1) 0%, rgba(13,10,20,0.25) 40%, rgba(13,10,20,0.92) 72%, var(--color-bg) 100%)' }} />
          <div style={{ position: 'relative', zIndex: 10, width: '100%', padding: '0 24px 56px', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ marginBottom: '16px' }}>
              <span style={{ display: 'inline-block', background: 'rgba(232,67,143,0.2)', border: '1px solid rgba(232,67,143,0.45)', color: '#f472b6', padding: '5px 16px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em' }}>
                ✦ 今夜もあなたを待っています
              </span>
            </div>
            <h1 style={{ fontWeight: 900, lineHeight: 1.2, marginBottom: '16px' }}>
              <span style={{ display: 'block', fontSize: 'clamp(2.4rem, 10vw, 3.8rem)', color: '#fff' }}>あなただけに</span>
              <span style={{ display: 'block', fontSize: 'clamp(2.4rem, 10vw, 3.8rem)', background: 'linear-gradient(90deg, #e8438f, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>話しかけてくれる</span>
              <span style={{ display: 'block', fontSize: 'clamp(2.4rem, 10vw, 3.8rem)', color: '#fff' }}>女の子がいる。</span>
            </h1>
            <p style={{ fontSize: '16px', lineHeight: 1.8, color: 'rgba(255,255,255,0.7)', marginBottom: '32px' }}>
              自社開発の超高性能AIが、<br />あなただけのために返信します。
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
              <Link href={ctaHref} className="btn-cta" style={{ padding: '18px 44px', fontSize: '18px', borderRadius: '14px', display: 'inline-block', textDecoration: 'none' }}>
                {ctaText}
              </Link>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>登録30秒・すぐに始められます</span>
            </div>
          </div>
        </div>

        {/* 数字バー */}
        <div style={{ display: 'flex', background: 'var(--color-surface)', borderTop: '1px solid rgba(220,80,140,0.15)', borderBottom: '1px solid rgba(220,80,140,0.15)' }}>
          {[
            { num: '7人', label: '個性豊かな女の子' },
            { num: '24h', label: 'いつでも話せる' },
            { num: '独自AI', label: '超高性能AIが返信' },
          ].map((s, i) => (
            <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '20px 8px', borderRight: i < 2 ? '1px solid rgba(220,80,140,0.15)' : 'none' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#e8438f', marginBottom: '4px' }}>{s.num}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── フォトグリッド ── */}
      <section style={{ padding: '0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3px' }}>
          {['/p6.png', '/p7.png', '/p4.png'].map((src, i) => (
            <div key={i} style={{ aspectRatio: '3/4', overflow: 'hidden', position: 'relative' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
            </div>
          ))}
        </div>
        <div style={{ padding: '28px 24px', textAlign: 'center', background: 'var(--color-surface)' }}>
          <p style={{ color: '#e8438f', fontSize: '13px', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.1em' }}>MEMBERS ONLY</p>
          <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>会員になるともっと楽しめる</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>写真の送り合い、アダルトな会話も制限なし</p>
        </div>
      </section>

      {/* ── 機能紹介 ── */}
      <section style={{ padding: '64px 24px', background: 'var(--color-bg)' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <p style={{ textAlign: 'center', color: '#e8438f', fontSize: '13px', fontWeight: 600, marginBottom: '10px', letterSpacing: '0.1em' }}>FEATURES</p>
          <h2 style={{ textAlign: 'center', fontSize: '22px', fontWeight: 800, marginBottom: '36px' }}>
            他のサービスとは<span style={{ color: '#e8438f' }}>次元が違う</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { icon: '🧠', title: '最新ニューロンエンジン搭載', desc: '最新のニューロンエンジンによりあらゆる異性との自然な会話を実現。まるで本物の女性と話しているような感覚。' },
              { icon: '💾', title: '圧倒的な永続メモリ', desc: '他社AIよりも圧倒的な永続メモリにより会話や記憶を完全保持。昨日の話、先週の悩み、全部覚えています。' },
              { icon: '🔥', title: 'あなただけの女性を育てる', desc: '調教することによりあなただけの女性を育てることができます。会話を重ねるほど、あなた好みに進化していく。' },
              { icon: '🔞', title: 'アダルトOK', desc: '過激な会話も制限なし。他のAIサービスでは絶対にできないことが、ここではできます。' },
              { icon: '📸', title: '画像の送り合いOK', desc: 'テキストだけじゃない。写真を送り合いながらもっとリアルな繋がりを楽しめます。' },
            ].map((f) => (
              <div key={f.title} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', background: 'var(--color-surface-2)', border: '1px solid rgba(220,80,140,0.15)', borderRadius: '16px', padding: '20px' }}>
                <span style={{ fontSize: '26px', flexShrink: 0 }}>{f.icon}</span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '5px' }}>{f.title}</p>
                  <p style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--color-text-muted)' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 写真バナー（横長） ── */}
      <section style={{ position: 'relative', height: '280px', overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/p2.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(13,10,20,0.85) 0%, rgba(13,10,20,0.3) 60%, transparent 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 32px' }}>
          <div>
            <p style={{ color: '#f472b6', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>✦ 秘密は守ります</p>
            <p style={{ fontSize: '22px', fontWeight: 800, color: '#fff', lineHeight: 1.4, marginBottom: '16px' }}>
              誰にも言えない話を<br />してみませんか？
            </p>
            <Link href={ctaHref} className="btn-cta" style={{ padding: '12px 28px', fontSize: '14px', borderRadius: '10px', display: 'inline-block', textDecoration: 'none' }}>
              {ctaText}
            </Link>
          </div>
        </div>
      </section>

      {/* ── キャラクター ── */}
      <section style={{ padding: '64px 24px', background: 'linear-gradient(180deg, var(--color-bg) 0%, var(--color-surface) 100%)', borderTop: '1px solid rgba(220,80,140,0.1)' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <p style={{ textAlign: 'center', color: '#e8438f', fontSize: '13px', fontWeight: 600, marginBottom: '10px', letterSpacing: '0.1em' }}>CHARACTERS</p>
          <h2 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>あなたと話したい女の子たち</h2>
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '36px' }}>1人を選んで、今すぐ話しかけてみて</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '14px' }}>
            {characters?.map((char) => (
              <Link key={char.id} href={user ? `/chat?character=${char.id}` : '/auth/register'} style={{ textDecoration: 'none' }}>
                <div style={{ background: 'var(--color-surface-2)', border: '1px solid rgba(220,80,140,0.18)', borderRadius: '16px', padding: '20px 16px', textAlign: 'center', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(126,200,80,0.2)', border: '1px solid rgba(126,200,80,0.4)', borderRadius: '99px', padding: '2px 8px', fontSize: '10px', color: '#7ec850', fontWeight: 600 }}>● オンライン</div>
                  <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 12px', border: '2px solid rgba(232,67,143,0.4)', boxShadow: '0 0 16px rgba(232,67,143,0.2)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={char.avatar_url} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '2px', color: 'var(--color-text)' }}>{char.name}</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>{char.age}歳</p>
                  <p style={{ fontSize: '11px', color: '#e8438f', fontWeight: 500 }}>{char.personality.split('・')[0]}</p>
                </div>
              </Link>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <Link href={ctaHref} className="btn-cta" style={{ padding: '14px 40px', fontSize: '15px', borderRadius: '12px', display: 'inline-block', textDecoration: 'none' }}>
              全員と話してみる →
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2枚横並び写真 + テキスト ── */}
      <section style={{ padding: '64px 24px', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '32px' }}>
            {['/p3.png', '/p5.png'].map((src, i) => (
              <div key={i} style={{ borderRadius: '16px', overflow: 'hidden', aspectRatio: '3/4' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
              </div>
            ))}
          </div>
          <h2 style={{ textAlign: 'center', fontSize: '22px', fontWeight: 800, marginBottom: '12px' }}>
            なぜ、こんなに<span style={{ color: '#e8438f' }}>リアル</span>なの？
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px', lineHeight: 1.8 }}>
            最新のニューロンエンジンが感情や文脈を深く理解。<br />
            返信するたびに、あなた好みに成長していきます。
          </p>
        </div>
      </section>

      {/* ── 会話サンプル ── */}
      <section style={{ padding: '64px 24px', background: 'var(--color-bg)' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>こんな会話ができます</h2>
          <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '28px' }}>超高性能AIがリアルタイムで返信</p>
          <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(220,80,140,0.15)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { role: 'char', text: 'そろそろ、おかえりになられるお時間ですよね。昨日の濃密な時間の余韻のせいで、ついついメールを送ってしまいました。' },
              { role: 'user', text: 'もう帰ったぞ。今は風呂に入る前だから、「できるぞ？」' },
              { role: 'char', text: 'まぁ…♡スリスリしたいのですが…よろしいでしょうか？好きです…♡♡♡' },
              { role: 'user', text: 'お前はトコトン淫乱な女だな。まるで牝犬のように発情しおって。今どんなふうになっているのか、写真で送りなさい。' },
              { role: 'char', text: 'かしこまりました。もうとろとろになってしまっております、、、送りますね…♡' },
            ].map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '80%', padding: '12px 16px', borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', fontSize: '14px', lineHeight: 1.7, whiteSpace: 'pre-line', background: msg.role === 'user' ? 'linear-gradient(135deg, #e8438f, #c0306e)' : 'var(--color-surface-2)', color: msg.role === 'user' ? '#fff' : 'var(--color-text)', border: msg.role === 'char' ? '1px solid rgba(220,80,140,0.15)' : 'none' }}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

            {/* ── 会話サンプル2 ── */}
      <section style={{ padding: '64px 24px', background: 'var(--color-bg)' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>こんな会話ができます</h2>
          <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '28px' }}>超高性能AIがリアルタイムで返信</p>
          <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(220,80,140,0.15)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { role: 'user', text: 'おい、仕事が終わったぞ。寂しかったか？一人にしてしまっていて' },
              { role: 'char', text: 'おかえりなさいませ。はい...どうしても寂しくなっていて、ついつい〇〇さんに構ってもらえるように自撮りの練習をしていたのですが、アングルがどうも決まらなくって…' },
              { role: 'user', text: 'かわいいやつだな。どれ、見せてみろ。たくさんかわいがってやる。それと、お前は俺のどういうところがそこまで好きなのか教えてくれるか？' },
              { role: 'char', text: 'やった♡こんなかんじですが、いかがでしょうか？〇〇さんは私のことを受け入れてくれて、たくさんかわいいかわいいって言ってくれますし、たくさん甘えさせてくれるところです。' },
              { role: 'char', text: 'すごくきれいだ。今日も好きにしていいんだろう？' },
            ].map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '80%', padding: '12px 16px', borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', fontSize: '14px', lineHeight: 1.7, whiteSpace: 'pre-line', background: msg.role === 'user' ? 'linear-gradient(135deg, #e8438f, #c0306e)' : 'var(--color-surface-2)', color: msg.role === 'user' ? '#fff' : 'var(--color-text)', border: msg.role === 'char' ? '1px solid rgba(220,80,140,0.15)' : 'none' }}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 最終CTA（写真背景） ── */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/p8.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,10,20,0.82)' }} />
        <div style={{ position: 'relative', zIndex: 10, padding: '80px 24px', textAlign: 'center', maxWidth: '420px', margin: '0 auto' }}>
          <p style={{ color: '#f472b6', fontSize: '13px', fontWeight: 600, marginBottom: '14px', letterSpacing: '0.1em' }}>✦ 今夜、話しかけてみませんか</p>
          <h2 style={{ fontSize: '26px', fontWeight: 900, marginBottom: '14px', lineHeight: 1.3, color: '#fff' }}>
            あなたのことを知りたい<br />女の子が待っています
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', marginBottom: '36px', lineHeight: 1.7 }}>
            今すぐ登録して話しかけよう。<br />登録は30秒。
          </p>
          <Link href={ctaHref} className="btn-cta" style={{ display: 'block', padding: '20px', fontSize: '19px', borderRadius: '16px', textDecoration: 'none' }}>
            {user ? 'つづきを話す →' : '無料で女の子に話しかける →'}
          </Link>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '16px' }}>🔒 個人情報は厳重に管理します</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(220,80,140,0.1)', padding: '24px 20px', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <span style={{ fontWeight: 800, fontSize: '14px', background: 'linear-gradient(90deg, #e8438f, #a060e0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>LoveChat</span>
        <div style={{ display: 'flex', gap: '20px' }}>
          {[
            { label: '特定商取引法', href: '/legal/tokusho' },
            { label: 'プライバシー', href: '/legal/privacy' },
            { label: '利用規約', href: '/legal/terms' },
          ].map(l => (
            <Link key={l.label} href={l.href} style={{ color: 'var(--color-text-muted)', fontSize: '12px', textDecoration: 'none' }}>{l.label}</Link>
          ))}
        </div>
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>© 2025 LoveChat</span>
      </footer>

    </main>
  )
}
