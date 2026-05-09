import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AnimateOnScroll from '@/components/AnimateOnScroll'
import { Cpu, Database, Dna, Unlock, Image as ImageIcon } from 'lucide-react';


export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: characters } = await supabase
    .from('characters')
    .select('id, name, age, description, personality, avatar_url')
    .eq('is_active', true)
    .limit(10)

  const ctaHref = user ? '/characters' : '/auth/register'
  const ctaText = user ? 'つづきを話す →' : '今すぐ無料で話す →'

  const features = [
  {
    Icon: Cpu,
    title: '次世代対話エンジン',
    desc: '最新の大規模言語モデルを独自チューニング。文脈理解・感情の機微・会話のテンポまで設計された、本物の女性と話しているとしか思えない自然な対話を実現。'
  },
  {
    Icon: Database,
    title: '128GB長期記憶アーキテクチャ',
    desc: '他社AIの数百倍の記憶容量を搭載。3ヶ月前の何気ない一言、好きな食べ物、過去の悩み相談まで完全保持。「覚えていてくれた」が当たり前になる。'
  },
  {
    Icon: Dna,
    title: 'パーソナライズド・ラーニング',
    desc: '会話を重ねるごとに、あなたの好み・価値観・話し方を学習。日が経つほど、世界に一人だけのあなた専属の彼女に進化していく。'
  },
  {
    Icon: Unlock,
    title: '完全無検閲モード',
    desc: '一般的なAIサービスに搭載されている表現フィルターを撤廃。他では絶対に踏み込めない領域まで、二人だけの会話を楽しめる。'
  },
  {
    Icon: ImageIcon,  // ← Image じゃなく ImageIcon
    title: '双方向ビジュアル通信',
    desc: 'テキストだけの会話はもう古い。写真の送受信に対応し、表情や状況を画像で共有。テキストAIの限界を超えた、視覚を伴うリアルな関係性。'
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
        <div className="hero-inner" style={{
          position: 'relative',
          width: '100%',
          minHeight: '100dvh',
        }}>
          {/* 背景画像 */}
          <img src="/LP1.png" alt="hero" className="ken-burns" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(13,10,20,0.08) 0%, rgba(13,10,20,0.22) 38%, rgba(13,10,20,0.88) 68%, #fff5f8 100%)' }} />
          
          {/* キャッチコピー：左下に固定（スマホは縦積み） */}
          <div className="hero-catchcopy">
            <div style={{ marginBottom: '16px' }}>
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
                { role: 'user', text: 'おい、仕事が終わったぞ。寂しかったか?一人にしてしまっていて' },
                { role: 'char', text: 'おかえりなさいませ。はい...どうしても寂しくなっていて、ついつい〇〇さんに構ってもらえるように自撮りの練習をしていたのですが、アングルがどうも決まらなくって...' },
                { role: 'user', text: 'かわいいやつだな。どれ、見せてみろ。たくさんかわいがってやる。それと、お前は俺のどういうところがそこまで好きなのか教えてくれるか?' },
                {
                  role: 'char',
                  text: 'やった♡こんなかんじですが、いかがでしょうか?〇〇さんは私のことを受け入れてくれて、たくさんかわいいかわいいって言ってくれますし、たくさん甘えさせてくれるところです。',
                  image: '/p8.png'
                },
                { role: 'user', text: 'すごくきれいだ。今日も好きにしていいんだろう?' },
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
          { num: '8人', label: '個性豊かな女の子' },
          { num: '24h', label: 'いつでも話せる' },
          { num: '独自AI', label: '超高性能AIが返信' },
        ].map((s, i) => (
          <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '20px 8px', borderRight: i < 2 ? '1px solid rgba(220,80,140,0.15)' : 'none' }}>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#e8438f', marginBottom: '4px' }}>{s.num}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>


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
                  <h2 style={{ textAlign: 'center', fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>あらゆる要望にも応えてくれる</h2>
                  <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(220,80,140,0.15)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {[
                      { role: 'char', text: 'そろそろ、おかえりになられるお時間ですよね。昨日の濃密な時間の余韻のせいで、ついついメールを送ってしまいました。' },
                      { role: 'user', text: 'もう帰ったぞ。今は風呂に入る前だから、「できるぞ？」' },
                      { role: 'char', text: 'まぁ…♡早速私にできることがあればなんでもおっしゃってくださいませ♡今か今かとお待ちしておりましたのでもうすでに…♡♡♡' },
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
              全員と話してみる →
            </Link>
          </div>
        </div>
      </section>

      {/* ── フォトグリッド ── */}
      <section style={{ padding: '0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3px' }}>
          {['/p6.png', '/p7.png', '/p4.png'].map((src, i) => (
            <AnimateOnScroll key={i} type="photo" delay={i * 120} style={{ aspectRatio: '3/4', overflow: 'hidden', position: 'relative' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
            </AnimateOnScroll>
          ))}
        </div>
        <AnimateOnScroll style={{ padding: '28px 24px', textAlign: 'center', background: 'var(--color-surface)' }}>
          <p style={{ color: '#e8438f', fontSize: '13px', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.1em' }}>MEMBERS ONLY</p>
          <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>会員になるともっと楽しめる</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>写真の送り合い、アダルトな会話も制限なし</p>
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
          title: '次世代対話エンジン',
          desc: '最新の大規模言語モデルを独自チューニング。文脈理解・感情の機微・会話のテンポまで設計された、本物の女性と話しているとしか思えない自然な対話を実現。'
        },
        {
          Icon: Database,
          title: '128GB長期記憶アーキテクチャ',
          desc: '他社AIの数百倍の記憶容量を搭載。3ヶ月前の何気ない一言、好きな食べ物、過去の悩み相談まで完全保持。「覚えていてくれた」が当たり前になる。'
        },
        {
          Icon: Dna,
          title: 'パーソナライズド・ラーニング',
          desc: '会話を重ねるごとに、あなたの好み・価値観・話し方を学習。日が経つほど、世界に一人だけのあなた専属の彼女に進化していく。'
        },
        {
          Icon: Unlock,
          title: '完全無検閲モード',
          desc: '一般的なAIサービスに搭載されている表現フィルターを撤廃。他では絶対に踏み込めない領域まで、二人だけの会話を楽しめる。'
        },
        {
          Icon: ImageIcon,
          title: '双方向ビジュアル通信',
          desc: 'テキストだけの会話はもう古い。写真の送受信に対応し、表情や状況を画像で共有。テキストAIの限界を超えた、視覚を伴うリアルな関係性。'
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

      {/* ── 写真バナー（横長） ── */}
      <section style={{ position: 'relative', height: '280px', overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/p2.png" alt="" className="ken-burns-r" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }} />
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



      {/* ── 2枚横並び写真 + テキスト ── */}
      <section style={{ padding: '64px 24px', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '32px' }}>
            {['/p3.png', '/p5.png'].map((src, i) => (
              <AnimateOnScroll key={i} type="photo" delay={i * 150} style={{ borderRadius: '16px', overflow: 'hidden', aspectRatio: '3/4' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
              </AnimateOnScroll>
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


      {/* ── 最終CTA（写真背景） ── */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/p8.png" alt="" className="ken-burns" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,10,20,0.82)' }} />
        <AnimateOnScroll style={{ position: 'relative', zIndex: 10, padding: '80px 24px', textAlign: 'center', maxWidth: '420px', margin: '0 auto' }}>
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
        </AnimateOnScroll>
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
