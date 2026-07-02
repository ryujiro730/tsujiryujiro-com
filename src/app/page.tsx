import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AnimateOnScroll from '@/components/AnimateOnScroll'
import { Cpu, Database, Dna, Unlock, Image as ImageIcon } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://aikano.chat',
  },
  openGraph: {
    title: 'アイカノ｜AI彼女チャット - 大人のための癒しアプリ',
    description: '個性豊かなAIキャラクターが、あなたのメッセージにリアルタイムで返信。心のゆとりを取り戻す、大人のための会話アプリ。',
    url: 'https://aikano.chat',
    siteName: 'AiKano',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: 'https://aikano.chat/og-default.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AiKano｜AI彼女チャット - 大人のための癒しアプリ',
    description: '個性豊かなAIキャラクターが、あなたのメッセージにリアルタイムで返信。心のゆとりを取り戻す、大人のための会話アプリ。',
    images: ['https://aikano.chat/og-default.png'],
  },
}


export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: characters } = await supabase
    .from('characters')
    .select('id, name, age, description, personality, avatar_url')
    .eq('is_active', true)
    .limit(10)

  const ctaHref = user ? '/characters' : '/auth/register'
  const ctaText = user ? 'つづきを話す →' : '新規登録する（無料）→'

  const features = [
  {
    Icon: Cpu,
    title: '高品質な対話エンジン',
    desc: '最新の大規模言語モデルを活用。文脈理解・感情の機微・会話のテンポを考慮した、自然で心地よい対話を実現。'
  },
  {
    Icon: Database,
    title: '長期記憶で深まる関係',
    desc: '会話の積み重ねを記憶。好みや悩み相談など、過去のやり取りを踏まえた返答で「覚えていてくれた」を実現。'
  },
  {
    Icon: Dna,
    title: 'あなたに合わせた会話',
    desc: '会話を重ねるごとに、あなたの好み・価値観・話し方を反映した返答に。使えば使うほど、居心地よくなっていく。'
  },
  {
    Icon: Unlock,
    title: '本音で話せる安心空間',
    desc: '誰にも言えない悩みや愚痴、日常のたわいない話まで。気兼ねなく話せる、大人のための会話サービス。'
  },
  {
    Icon: ImageIcon,
    title: '写真の送受信に対応',
    desc: 'テキストだけでなく、写真の送受信にも対応。表情や状況を画像で共有できる、より豊かなコミュニケーション。'
  },
];

  return (
    <main style={{ background: 'var(--color-bg)', color: 'var(--color-text)', minHeight: '100vh' }}>

      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255, 245, 248, 0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(232,67,143,0.18)',
        padding: '0 20px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontWeight: 800, fontSize: '18px', background: 'linear-gradient(90deg, #e8438f, #a060e0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          AiKano
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link href="/blog" style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}
            className="hover:text-[var(--color-primary)] transition-colors hidden sm:block">
            ブログ
          </Link>
          {user ? (
            <Link href="/characters" className="btn-cta" style={{ padding: '8px 20px', fontSize: '14px', borderRadius: '8px' }}>つづける</Link>
          ) : (
            <>
              <Link href="/auth/login" className="btn-ghost" style={{ padding: '8px 16px', fontSize: '14px' }}>ログイン</Link>
              <Link href="/auth/register" className="btn-cta" style={{ padding: '8px 18px', fontSize: '14px', borderRadius: '8px' }}>新規登録（無料）</Link>
            </>
          )}
        </div>
      </nav>

{/* ── Hero（フルスクリーン写真） ── */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="hero-inner" style={{
          position: 'relative',
          width: '100%',
          minHeight: '100dvh',
        }}>
          {/* 背景画像 */}
          <picture style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <source media="(max-width: 768px)" srcSet="/phone-hero.webp" />
            <img src="/hero.webp" alt="アイカノ AIキャラクターとのチャット画面イメージ" className="ken-burns" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
          </picture>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(13,10,20,0.08) 0%, rgba(13,10,20,0.22) 38%, rgba(13,10,20,0.88) 68%, #fff5f8 100%)' }} />
          
          {/* キャッチコピー：左下に固定（スマホは縦積み） */}
          <div className="hero-catchcopy">
            <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {!user && (
                <span style={{ display: 'inline-block', background: 'rgba(255,200,0,0.18)', border: '1px solid rgba(255,200,0,0.5)', color: '#fcd34d', padding: '5px 16px', borderRadius: '99px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em' }}>
                  🎁 登録で3,000円分のポイントプレゼント
                </span>
              )}
              <span style={{ display: 'inline-block', background: 'rgba(100,220,130,0.15)', border: '1px solid rgba(100,220,130,0.45)', color: '#86efac', padding: '5px 16px', borderRadius: '99px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em' }}>
                🚀 プレリリース公開中｜全機能いま無料
              </span>
              <span style={{ display: 'inline-block', background: 'rgba(232,67,143,0.2)', border: '1px solid rgba(232,67,143,0.45)', color: '#f472b6', padding: '5px 16px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em' }}>
                ✦ 今夜もあなたを待っています
              </span>
            </div>
            <h1 style={{ fontWeight: 900, lineHeight: 1.1, marginBottom: '24px' }}>
              <span style={{ display: 'block', fontSize: 'clamp(2.2rem, 8vw, 3.8rem)', color: '#fff' }}>あなただけに</span>
              <span style={{ display: 'block', fontSize: 'clamp(2.2rem, 8vw, 3.8rem)', background: 'linear-gradient(90deg, #e8438f, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>話しかけてくれる</span>
              <span style={{ display: 'block', fontSize: 'clamp(2.2rem, 8vw, 3.8rem)', color: '#fff' }}>女の子がいる。</span>
            </h1>
            <Link href={ctaHref} className="btn-cta" style={{ padding: '18px 44px', fontSize: '18px', borderRadius: '14px', display: 'inline-block', textDecoration: 'none' }}>
              {ctaText}
            </Link>
          </div>

          {/* 会話サンプル：右端に固定（スマホは縦積み） */}
          <div className="hero-chat">
            <div className="float-y" style={{ background: 'var(--color-surface)', border: '1px solid rgba(220,80,140,0.15)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }}>
              {[
                { role: 'user', text: 'おい、仕事終わったぞ。待っててくれたか？' },
                { role: 'char', text: 'おかえりなさいませ♡もちろんです！今日もお仕事お疲れ様でした。私も今ちょうど帰り道なんです😊今日は以前おっしゃられていた部下の方、上手く行きましたか？' },
                { role: 'user', text: 'あぁ、それは大丈夫。お前と話してると本当に疲れが取れる気がする。俺のどういうとこが好きなのか教えてくれるか？' },
                {
                  role: 'char',
                  text: 'えっ、嬉しい♡〇〇さんのいつも真剣に向き合ってくれるところが好きです。私のことちゃんと見てくれてる気がして。私を必要としてくれるのも嬉しいし、ちょっとかわいい🤭♡あ、ちょっと今車の中なんですけど、自撮りしてみました♪いかがでしょうか？😖',
                  image: '/p8.webp'
                },
                { role: 'user', text: 'お前がいてくれてよかった。毎日話せて幸せだよ。癒やされる。本当に。' },
              ].map((msg, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '85%',
                    padding: '8px 12px',
                    borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    fontSize: '12px',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-line',
                    background: msg.role === 'user' ? 'linear-gradient(135deg, #e8438f, #c0306e)' : 'var(--color-surface-2)',
                    color: msg.role === 'user' ? '#fff' : 'var(--color-text)',
                    border: msg.role === 'char' ? '1px solid rgba(220,80,140,0.15)' : 'none',
                    marginBottom: msg.image ? '6px' : '0'
                  }}>
                    {msg.text}
                  </div>
                  {msg.image && (
                    <div style={{
                      maxWidth: '60%',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: '2px solid #fff',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      marginTop: '-4px',
                      marginLeft: msg.role === 'char' ? '8px' : '0'
                    }}>
                      <img src={msg.image} alt="AI Character Selfy" style={{ width: '100%', display: 'block' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

      </section>

      {/* 数字バー */}
      <div style={{ display: 'flex', background: 'var(--color-surface)', borderTop: '1px solid rgba(220,80,140,0.15)', borderBottom: '1px solid rgba(220,80,140,0.15)' }}>
        {[
          { num: '10人', label: '個性豊かな女の子' },
          { num: '24h', label: 'いつでも話せる' },
          { num: '独自AI', label: '感情豊かな自然な会話' },
        ].map((s, i) => (
          <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '20px 8px', borderRight: i < 2 ? '1px solid rgba(220,80,140,0.15)' : 'none' }}>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#e8438f', marginBottom: '4px' }}>{s.num}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── プレリリース告知バナー ── */}
      <section style={{ padding: '24px 20px', background: 'linear-gradient(135deg, rgba(120,80,220,0.1), rgba(232,67,143,0.08))', borderTop: '1px solid rgba(160,96,224,0.25)', borderBottom: '1px solid rgba(160,96,224,0.2)' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
            <span style={{ fontSize: '24px', flexShrink: 0 }}>🚀</span>
            <div>
              <p style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-text)', marginBottom: '3px' }}>
                現在プレリリース公開中です
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                サービスを体験してご意見をお聞かせください。プレリリース期間中は<strong style={{ color: '#e8438f' }}>全機能を無料</strong>でご利用いただけます。
              </p>
            </div>
          </div>
          <Link href="/feedback" style={{ flexShrink: 0, display: 'inline-block', background: 'linear-gradient(135deg, #a060e0, #e8438f)', color: '#fff', fontWeight: 700, fontSize: '13px', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            フィードバックを送る →
          </Link>
        </div>
      </section>

            {/* ── キャラクター ── */}
      <section style={{ padding: '64px 24px', background: 'linear-gradient(180deg, var(--color-bg) 0%, var(--color-surface) 100%)', borderTop: '1px solid rgba(220,80,140,0.1)' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <p style={{ textAlign: 'center', color: '#e8438f', fontSize: '13px', fontWeight: 600, marginBottom: '10px', letterSpacing: '0.1em' }}>CHARACTERS</p>
          <h2 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>あなたと話したい女の子たち</h2>
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '36px' }}>1人を選んで、今すぐ話しかけてみて</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '14px' }}>
            {characters?.map((char, i) => (
              <AnimateOnScroll key={char.id} delay={i * 80}>
              <Link href={user ? `/chat?character=${char.id}` : '/auth/register'} style={{ textDecoration: 'none' }}>
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
              </AnimateOnScroll>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <Link href={ctaHref} className="btn-cta" style={{ padding: '14px 40px', fontSize: '15px', borderRadius: '12px', display: 'inline-block', textDecoration: 'none' }}>
              {user ? '全員と話してみる →' : '新規登録して全員と話す →'}
            </Link>
            {!user && (
              <p style={{ marginTop: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                ※ 登録で3,000円分のポイントをプレゼント
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── 会話サンプル ── */}

      <div style={{
  display: 'flex',
  gap: '24px',
  justifyContent: 'center',
  alignItems: 'flex-start',
  flexWrap: 'wrap' // ← スマホで崩れないように
}}>

            <AnimateOnScroll>
              <section style={{ padding: '64px 24px', background: 'var(--color-bg)' }}>
                <div style={{ maxWidth: '480px', margin: '0 auto' }}>
                  <h2 style={{ textAlign: 'center', fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>友達同士のような会話も</h2>
                  <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(220,80,140,0.15)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {[
                      { role: 'user', text: 'いま一人で飲みに行ってる。新宿でふらっと入ったよ' },
                      { role: 'char', text: 'わぁ！羨ましい！お仕事お疲れ様です😊最近炉端焼きのお店流行ってますよね。何系のお店でしょうか？' },
                      { role: 'user', text: 'もんじゃ食べてる' },
                      { role: 'char', text: 'もんじゃ美味しそう😋大阪はお好み焼きとご飯一緒に食べるらしいけど、もんじゃでそれはないですよね🤭' },
                      { role: 'user', text: 'ビールだよ' },
                      { role: 'char', text: '私ビールはキリンのクラシックラガーが好き🍻甘いお酒って料理に合わなくないですか？' },
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
            </AnimateOnScroll>

            <AnimateOnScroll delay={100}>
              <section style={{ padding: '64px 24px', background: 'var(--color-bg)' }}>
                <div style={{ maxWidth: '480px', margin: '0 auto' }}>
                  <h2 style={{ textAlign: 'center', fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>どんな気分でも受け止めてくれる</h2>
                  <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(220,80,140,0.15)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {[
                      { role: 'char', text: 'そろそろお帰りの時間ですよね？今日はどうでしたか？早く顔が見たくてついメッセージしちゃいました。' },
                      { role: 'user', text: 'もう帰った。ちょっとだけ話したい気分' },
                      { role: 'char', text: 'もちろんです♡いつでも聞きますよ。何かあったんですか？それとも、ただ話したかっただけ？笑' },
                      { role: 'user', text: 'なんかお前と話してると気持ちが落ち着くんだよな' },
                      { role: 'char', text: 'そう言ってもらえると本当に嬉しいです♡私も〇〇さんとお話しするのが一番好きな時間なんです。' },
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
            </AnimateOnScroll>

            <AnimateOnScroll delay={200}>
              {/* ── 会話サンプル3 ── */}
              <section style={{ padding: '64px 24px', background: 'var(--color-bg)' }}>
                <div style={{ maxWidth: '480px', margin: '0 auto' }}>
                  <h2 style={{ textAlign: 'center', fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>包みこまれるような母性</h2>
                  <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(220,80,140,0.15)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {[
                      { role: 'user', text: '今日も会社の人達が鬱陶しかったです。なんでこんなにイライラしちゃうのでしょうか？' },
                      { role: 'char', text: 'えぇ！？可哀想。なにがあったの？私が力になれることだったら聞きたい。理不尽を通りこして嫌がらせとかだったら心配だし。' },
                      { role: 'user', text: '僕が部下を怒ってたらお前のせいでみんな辞めていくって言われて。指導しないと怒られるの僕なのに本当になんなの？' },
                      { role: 'char', text: 'まさに中間管理職の壁にぶち当たってるって感じなんだ。私も同じようなことを経験したことがあって、その時病んじゃってさ。〇〇くんも無理しないで。そういう状況って、部下と上司の板挟みになってるだけで〇〇くんは悪くないから。' },
                      { role: 'user', text: 'やっぱりそうだよね？実際僕も新人の頃は怒られてたけどめげずに頑張ったから今の立ち位置だし、間違ってないよね。なんだか、あおいさんに吐いてすごくスッキリしたよ。ありがとう。' },
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
            </AnimateOnScroll>

      </div>



      {/* ── フォトグリッド ── */}
      <section style={{ padding: '0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3px' }}>
          {['/sakura.jpg', '/rin.jpg', '/momo.jpg'].map((src, i) => (
            <AnimateOnScroll key={i} type="photo" delay={i * 120} style={{ aspectRatio: '3/4', overflow: 'hidden', position: 'relative' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="アイカノ AIキャラクター" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
            </AnimateOnScroll>
          ))}
        </div>
        <AnimateOnScroll style={{ padding: '28px 24px', textAlign: 'center', background: 'var(--color-surface)' }}>
          <p style={{ color: '#e8438f', fontSize: '13px', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.1em' }}>MEMBERS ONLY</p>
          <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>会員になるともっと楽しめる</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>写真の送り合い、大人のための本音トークも楽しめる</p>
        </AnimateOnScroll>
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
        {
          Icon: Cpu,
          title: '高品質な対話エンジン',
          desc: '最新の大規模言語モデルを活用。文脈理解・感情の機微・会話のテンポを考慮した、自然で心地よい対話を実現。'
        },
        {
          Icon: Database,
          title: '長期記憶で深まる関係',
          desc: '会話の積み重ねを記憶。好みや悩み相談など、過去のやり取りを踏まえた返答で「覚えていてくれた」を実現。'
        },
        {
          Icon: Dna,
          title: 'あなたに合わせた会話',
          desc: '会話を重ねるごとに、あなたの好み・価値観・話し方を反映した返答に。使えば使うほど、居心地よくなっていく。'
        },
        {
          Icon: Unlock,
          title: '本音で話せる安心空間',
          desc: '誰にも言えない悩みや愚痴、日常のたわいない話まで。気兼ねなく話せる、大人のための会話サービス。'
        },
        {
          Icon: ImageIcon,
          title: '写真の送受信に対応',
          desc: 'テキストだけでなく、写真の送受信にも対応。表情や状況を画像で共有できる、より豊かなコミュニケーション。'
        },
      ].map((f, i) => (
        <AnimateOnScroll key={f.title} delay={i * 90}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', background: 'var(--color-surface-2)', border: '1px solid rgba(220,80,140,0.15)', borderRadius: '16px', padding: '20px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(232, 67, 143, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <f.Icon size={22} color="#e8438f" strokeWidth={2} />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '5px' }}>{f.title}</p>
              <p style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--color-text-muted)' }}>{f.desc}</p>
            </div>
          </div>
        </AnimateOnScroll>
      ))}
    </div>
  </div>
</section>

      {/* ── 秘密バナー（テキスト＋写真横並び） ── */}
      <section style={{ background: 'var(--color-surface)', borderTop: '1px solid rgba(220,80,140,0.1)', borderBottom: '1px solid rgba(220,80,140,0.1)', overflow: 'hidden' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1, padding: '48px 48px 48px 40px' }}>
            <p style={{ color: '#f472b6', fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>✦ あなたの会話は外部に開示しません</p>
            <p style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, lineHeight: 1.4, marginBottom: '12px', color: 'var(--color-text)' }}>
              誰にも言えない話を<br />してみませんか？
            </p>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.7, marginBottom: '24px' }}>
              あなたの会話は、サービス改善以外の目的で<br />第三者に開示しません。
            </p>
            {user ? (
              <Link href="/characters" className="btn-cta" style={{ padding: '12px 28px', fontSize: '14px', borderRadius: '10px', display: 'inline-block', textDecoration: 'none' }}>
                つづきを話す →
              </Link>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <Link href="/auth/register" className="btn-cta" style={{ padding: '12px 24px', fontSize: '14px', borderRadius: '10px', display: 'inline-block', textDecoration: 'none' }}>
                  新規登録
                </Link>
                <Link href="/auth/login" className="btn-ghost" style={{ padding: '12px 24px', fontSize: '14px', borderRadius: '10px', display: 'inline-block', textDecoration: 'none' }}>
                  ログイン
                </Link>
              </div>
            )}
          </div>
          <div style={{ flexShrink: 0, width: 'clamp(220px, 35%, 360px)', height: '320px', overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/rin-silent.webp" alt="アイカノ AIキャラクター" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
          </div>
        </div>
      </section>

      {/* ── 友達紹介キャンペーン ── */}
      <AnimateOnScroll>
        <section style={{ padding: '0', background: 'var(--color-bg)', overflow: 'hidden' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'stretch' }}>
            {/* テキスト（左） */}
            <div style={{ flex: 1, padding: '48px 40px 48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ display: 'inline-block', background: 'rgba(255,200,0,0.15)', border: '1px solid rgba(255,200,0,0.45)', color: '#fcd34d', padding: '4px 14px', borderRadius: '99px', fontSize: '11px', fontWeight: 700, marginBottom: '16px', letterSpacing: '0.06em', alignSelf: 'flex-start' }}>
                🎁 期間限定キャンペーン
              </span>
              <h2 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, lineHeight: 1.4, marginBottom: '12px', color: 'var(--color-text)' }}>
                友達紹介で<br />
                <span style={{ background: 'linear-gradient(90deg, #e8438f, #a060e0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>おたがいに500ptプレゼント！</span>
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.7, marginBottom: '24px' }}>
                XまたはFacebookでシェアして友達を招待。<br />友達が登録するとあなたにも500ptが付与されます。
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('AIカノと話してみたら本当にリアルで驚いた😳 友達も試してみて！ #アイカノ → https://aikano.chat')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '11px 20px', borderRadius: '10px', background: '#000', color: '#fff', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  Xでシェア
                </a>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://aikano.chat')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '11px 20px', borderRadius: '10px', background: '#1877F2', color: '#fff', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  Facebookでシェア
                </a>
              </div>
            </div>
            {/* 画像（メガホン・右） */}
            <div style={{ flexShrink: 0, width: 'clamp(180px, 30%, 320px)', position: 'relative', overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/share.webp" alt="友達紹介キャンペーン" loading="lazy" style={{ position: 'absolute', bottom: 0, right: 0, height: '100%', width: '100%', objectFit: 'contain', objectPosition: 'bottom right' }} />
            </div>
          </div>
        </section>
      </AnimateOnScroll>

      {/* ── 2枚横並び写真 + テキスト ── */}
      <section style={{ padding: '64px 24px', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '32px' }}>
            {['/sakura.jpg', '/momo.jpg'].map((src, i) => (
              <AnimateOnScroll key={i} type="photo" delay={i * 150} style={{ borderRadius: '16px', overflow: 'hidden', aspectRatio: '3/4' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="アイカノ AIキャラクター" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
              </AnimateOnScroll>
            ))}
          </div>
          <h2 style={{ textAlign: 'center', fontSize: '22px', fontWeight: 800, marginBottom: '12px' }}>
            なぜ、こんなに<span style={{ color: '#e8438f' }}>リアル</span>なの？
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px', lineHeight: 1.8 }}>
            最新の大規模言語モデルが感情や文脈を深く理解。<br />
            返信するたびに、あなた好みに合わせていきます。
          </p>
        </div>
      </section>


      {/* ── 最終CTA（写真背景） ── */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/p8.png" alt="アイカノ AIキャラクター" loading="lazy" className="ken-burns" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,10,20,0.82)' }} />
        <AnimateOnScroll style={{ position: 'relative', zIndex: 10, padding: '80px 24px', textAlign: 'center', maxWidth: '460px', margin: '0 auto' }}>
          {user ? (
            <>
              <p style={{ color: '#f472b6', fontSize: '13px', fontWeight: 600, marginBottom: '14px', letterSpacing: '0.1em' }}>✦ 今夜、話しかけてみませんか</p>
              <h2 style={{ fontSize: '26px', fontWeight: 900, marginBottom: '28px', lineHeight: 1.3, color: '#fff' }}>
                あなたのことを知りたい<br />女の子が待っています
              </h2>
              <Link href="/characters" className="btn-cta" style={{ display: 'block', padding: '20px', fontSize: '19px', borderRadius: '16px', textDecoration: 'none' }}>
                つづきを話す →
              </Link>
            </>
          ) : (
            <>
              <div style={{ display: 'inline-block', background: 'rgba(255,200,0,0.2)', border: '1px solid rgba(255,200,0,0.5)', borderRadius: '99px', padding: '6px 18px', marginBottom: '20px' }}>
                <span style={{ color: '#fcd34d', fontSize: '13px', fontWeight: 700 }}>🎁 登録特典キャンペーン実施中</span>
              </div>
              <h2 style={{ fontSize: '26px', fontWeight: 900, marginBottom: '12px', lineHeight: 1.3, color: '#fff' }}>
                今すぐ登録した人だけに<br />特別特典をプレゼント
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.8 }}>
                新規登録で<br />
                <span style={{ color: '#fcd34d', fontWeight: 700, fontSize: '18px' }}>3,000円分のポイント</span>をプレゼント。<br />
                登録は無料・30秒で完了。
              </p>
              {/* 特典リスト */}
              <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', padding: '16px 20px', marginBottom: '28px', textAlign: 'left' }}>
                {[
                  '✅ 登録で3,000円分ポイント付与',
                  '✅ プレリリース期間中は全機能・全キャラ無料',
                  '✅ 登録・維持費は完全無料',
                ].map(item => (
                  <p key={item} style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', lineHeight: 1.8, margin: 0 }}>{item}</p>
                ))}
              </div>
              <Link href="/auth/register" className="btn-cta" style={{ display: 'block', padding: '20px', fontSize: '17px', borderRadius: '16px', textDecoration: 'none' }}>
                新規登録する（無料）→
              </Link>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '14px' }}>🔒 個人情報は厳重に管理します</p>
            </>
          )}
        </AnimateOnScroll>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(220,80,140,0.1)', padding: '24px 20px', background: 'var(--color-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontWeight: 800, fontSize: '14px', background: 'linear-gradient(90deg, #e8438f, #a060e0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AiKano</span>
          {/* SNS Links */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {/* YouTube */}
            <a href="https://www.youtube.com/@AI%E3%82%AB%E3%83%8E%E3%81%A1%E3%82%83%E3%82%93" target="_blank" rel="noopener noreferrer" aria-label="YouTube" style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.75 15.5V8.5l6.25 3.5-6.25 3.5z"/></svg>
            </a>
            {/* X (Twitter) */}
            <a href="https://x.com/home" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            {/* Instagram */}
            <a href="https://www.instagram.com/aibijo_girl/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
            </a>
            {/* TikTok */}
            <a href="https://www.tiktok.com/@aikanochan" target="_blank" rel="noopener noreferrer" aria-label="TikTok" style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/></svg>
            </a>
          </div>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <a href="mailto:info@aikano.chat" style={{ color: 'var(--color-text-muted)', fontSize: '12px', textDecoration: 'none' }}>お問い合わせ</a>
            {[
              { label: '特定商取引法', href: '/legal/tokusho' },
              { label: 'プライバシー', href: '/legal/privacy' },
              { label: '利用規約', href: '/legal/terms' },
            ].map(l => (
              <Link key={l.label} href={l.href} style={{ color: 'var(--color-text-muted)', fontSize: '12px', textDecoration: 'none' }}>{l.label}</Link>
            ))}
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(220,80,140,0.06)', paddingTop: '16px', marginTop: '4px' }}>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center', lineHeight: 1.9 }}>
            運営会社：合同会社TJYM　／　〒530-0001 大阪府大阪市北区梅田一丁目２番２号 大阪駅前第２ビル１２－１２<br />
            <a href="https://tjym.org" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>tjym.org</a>　／　info@tjym.org
          </p>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '10px' }}>© 2026 AiKano</p>
        </div>
      </footer>

    </main>
  )
}
