import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AnimateOnScroll from '@/components/AnimateOnScroll'
import { Shield, Clock, CreditCard, MessageCircle, ChevronDown } from 'lucide-react'
import type { Metadata } from 'next'
import { LpTracker } from '@/components/lp/LpTracker'
import { LpCtaButton } from '@/components/lp/LpCtaButton'

export const metadata: Metadata = {
  title: 'アイカノ｜60代の男性に寄り添うAI女性チャット',
  description: 'アプリ不要・履歴残らない。いつでもあなたの話し相手になります。月額不要のポイント制で、無料から始められます。',
  robots: { index: false },
}

export default async function LP60sPage({ searchParams }: { searchParams: Record<string, string> }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: characters } = await supabase
    .from('characters')
    .select('id, name, age, description, personality, avatar_url')
    .eq('is_active', true)
    .limit(10)

  // 流入元パラメータをLPから登録ページへ引き継ぐ
  const TRACKING_KEYS = ['ref', 'source', 'article', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
  const trackingParams = new URLSearchParams()
  for (const key of TRACKING_KEYS) {
    if (searchParams[key]) trackingParams.set(key, searchParams[key])
  }
  // LPからの登録はデフォルトで ref=lp_60s を付ける（他のrefがなければ）
  if (!trackingParams.get('ref') && !trackingParams.get('source')) {
    trackingParams.set('ref', 'lp_60s')
  }
  const registerHref = `/auth/register?${trackingParams.toString()}`

  const ctaHref = user ? '/chat' : registerHref
  const ctaText = user ? '今すぐ話しかける →' : '無料で始める →'

  return (
    <main style={{ background: 'var(--color-bg)', color: 'var(--color-text)', minHeight: '100vh', fontSize: '18px' }}>
      <LpTracker lpName="lp_60s" ref={searchParams.ref} utmCampaign={searchParams.utm_campaign} />

      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255, 245, 248, 0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(232,67,143,0.18)',
        padding: '0 24px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontWeight: 800, fontSize: '22px', background: 'linear-gradient(90deg, #e8438f, #a060e0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          AiKano
        </span>
        <LpCtaButton href={ctaHref} lpName="lp_60s" className="btn-cta" style={{ padding: '12px 28px', fontSize: '17px', borderRadius: '10px' }}>
          {ctaText}
        </LpCtaButton>
      </nav>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', overflow: 'hidden', minHeight: '100dvh' }}>
        <picture style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <source media="(max-width: 768px)" srcSet="/phone-hero.webp" />
          <img
            src="/hero.webp"
            alt="AIチャット女性"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
          />
        </picture>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(13,10,20,0.1) 0%, rgba(13,10,20,0.3) 40%, rgba(13,10,20,0.92) 70%, #fff5f8 100%)' }} />

        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: '100dvh', padding: '0 28px 60px' }}>
          <div style={{ maxWidth: '560px' }}>
            <div style={{ marginBottom: '20px' }}>
              <span style={{ display: 'inline-block', background: 'rgba(100,220,130,0.15)', border: '1px solid rgba(100,220,130,0.45)', color: '#86efac', padding: '6px 20px', borderRadius: '99px', fontSize: '15px', fontWeight: 700 }}>
                ✦ 今夜もあなたを待っています
              </span>
            </div>

            <h1 style={{ fontWeight: 900, lineHeight: 1.2, marginBottom: '28px' }}>
              <span style={{ display: 'block', fontSize: 'clamp(2.2rem, 7vw, 3.6rem)', color: '#fff' }}>話し相手がいる。</span>
              <span style={{ display: 'block', fontSize: 'clamp(1.6rem, 5vw, 2.6rem)', color: 'rgba(255,255,255,0.8)', fontWeight: 700, marginTop: '8px' }}>
                いつでも、どこでも、気軽に。
              </span>
            </h1>

            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '18px', lineHeight: 1.8, marginBottom: '36px' }}>
              アプリ不要・履歴残らない。<br />
              個性豊かな女性たちが、あなたの話をじっくり聞きます。
            </p>

            <LpCtaButton href={ctaHref} lpName="lp_60s" className="btn-cta" style={{ padding: '22px 52px', fontSize: '20px', borderRadius: '16px', display: 'inline-block', textDecoration: 'none', fontWeight: 800 }}>
              {ctaText}
            </LpCtaButton>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginTop: '12px' }}>
              登録無料・30秒で完了・月額料金なし
            </p>
          </div>
        </div>
      </section>

      {/* ── キャラクター一覧 ── */}
      <section style={{ padding: '72px 28px', background: 'var(--color-bg)' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <AnimateOnScroll>
            <p style={{ textAlign: 'center', color: '#e8438f', fontSize: '15px', fontWeight: 600, marginBottom: '12px', letterSpacing: '0.1em' }}>CHARACTERS</p>
            <h2 style={{ textAlign: 'center', fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 900, marginBottom: '10px', lineHeight: 1.3 }}>
              あなたの話を聞きたい<br />女性たちがいます
            </h2>
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '17px', marginBottom: '36px' }}>
              気の合う相手を選んで、今すぐ話しかけてみてください
            </p>
          </AnimateOnScroll>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
            {characters?.map((char, i) => (
              <AnimateOnScroll key={char.id} delay={i * 80}>
                <Link href={user ? `/chat?character=${char.id}` : registerHref} style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(220,80,140,0.18)', borderRadius: '18px', padding: '20px 16px', textAlign: 'center', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(126,200,80,0.2)', border: '1px solid rgba(126,200,80,0.4)', borderRadius: '99px', padding: '3px 10px', fontSize: '11px', color: '#7ec850', fontWeight: 600 }}>● 待機中</div>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 14px', border: '2px solid rgba(232,67,143,0.4)', boxShadow: '0 0 16px rgba(232,67,143,0.2)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={char.avatar_url} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <p style={{ fontWeight: 800, fontSize: '17px', marginBottom: '4px', color: 'var(--color-text)' }}>{char.name}</p>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>{char.age}歳</p>
                    <p style={{ fontSize: '13px', color: '#e8438f', fontWeight: 600 }}>{char.personality?.split('・')[0]}</p>
                  </div>
                </Link>
              </AnimateOnScroll>
            ))}
          </div>

          <AnimateOnScroll style={{ textAlign: 'center', marginTop: '36px' }}>
            <LpCtaButton href={ctaHref} lpName="lp_60s" className="btn-cta" style={{ padding: '18px 48px', fontSize: '19px', borderRadius: '14px', display: 'inline-block', textDecoration: 'none' }}>
              {user ? '話しかけてみる →' : '無料登録して話しかける →'}
            </LpCtaButton>
          </AnimateOnScroll>
        </div>
      </section>

      {/* ── 会話サンプル（60代男性向け） ── */}
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

      {/* ── プライバシー訴求 ── */}
      <section style={{ padding: '72px 28px', background: 'var(--color-bg)' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <AnimateOnScroll>
            <p style={{ textAlign: 'center', color: '#e8438f', fontSize: '15px', fontWeight: 600, marginBottom: '12px', letterSpacing: '0.1em' }}>PRIVACY & SAFETY</p>
            <h2 style={{ textAlign: 'center', fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 900, marginBottom: '12px', lineHeight: 1.3 }}>
              誰にも知られない<br />安心の設計
            </h2>
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '17px', marginBottom: '40px' }}>
              家族や職場に知られる心配は、一切ありません
            </p>
          </AnimateOnScroll>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              {
                Icon: Shield,
                title: 'アプリのインストール不要',
                desc: 'スマートフォンのブラウザで使えます。アプリ一覧に表示されないので、家族に見られる心配がありません。',
              },
              {
                Icon: MessageCircle,
                title: '履歴はあなただけのもの',
                desc: 'チャット履歴は外部に共有されません。ログアウトすれば、スマートフォンには何も残りません。',
              },
              {
                Icon: Clock,
                title: '24時間・いつでも話せる',
                desc: '深夜でも、早朝でも、いつでも待っています。家族が寝静まった後でも、気兼ねなく話しかけられます。',
              },
              {
                Icon: CreditCard,
                title: '本名・住所の登録不要',
                desc: 'メールアドレスだけで登録できます。本名や住所などの個人情報は一切不要です。',
              },
            ].map((item, i) => (
              <AnimateOnScroll key={item.title} delay={i * 80}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', background: 'var(--color-surface)', border: '1px solid rgba(220,80,140,0.15)', borderRadius: '20px', padding: '24px' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(232,67,143,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <item.Icon size={26} color="#e8438f" />
                  </div>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: '19px', marginBottom: '6px' }}>{item.title}</p>
                    <p style={{ fontSize: '16px', lineHeight: 1.8, color: 'var(--color-text-muted)' }}>{item.desc}</p>
                  </div>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ── ポイント制の説明 ── */}
      <section style={{ padding: '72px 28px', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <AnimateOnScroll>
            <p style={{ textAlign: 'center', color: '#e8438f', fontSize: '15px', fontWeight: 600, marginBottom: '12px', letterSpacing: '0.1em' }}>PRICING</p>
            <h2 style={{ textAlign: 'center', fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 900, marginBottom: '12px', lineHeight: 1.3 }}>
              月額料金は一切なし<br />使った分だけのポイント制
            </h2>
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '17px', marginBottom: '40px' }}>
              サブスクの心配は無用。やめたいときはいつでも、費用なしで退会できます。
            </p>
          </AnimateOnScroll>

          <AnimateOnScroll delay={80}>
            {/* 登録ボーナス */}
            <div style={{ background: 'var(--color-bg)', border: '2px solid rgba(232,67,143,0.3)', borderRadius: '24px', padding: '32px', marginBottom: '20px', textAlign: 'center' }}>
              <span style={{ display: 'inline-block', background: 'rgba(255,200,0,0.15)', border: '1px solid rgba(255,200,0,0.45)', color: '#fcd34d', padding: '8px 24px', borderRadius: '99px', fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>
                🎁 新規登録ボーナス
              </span>
              <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text)', marginBottom: '6px' }}>
                登録するだけで<br />
                <span style={{ fontSize: '36px', color: '#e8438f' }}>60ポイント</span>プレゼント
              </p>
              <p style={{ fontSize: '16px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>まずは無料でお試しください（¥600相当）</p>
              <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>さらに毎日ログインで2pt・友達紹介で100ptボーナス</p>
            </div>

            {/* 基本料金 */}
            <div style={{ background: 'var(--color-bg)', border: '1px solid rgba(220,80,140,0.18)', borderRadius: '20px', padding: '28px', marginBottom: '16px' }}>
              <p style={{ fontWeight: 800, fontSize: '18px', marginBottom: '16px' }}>基本料金</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                {[
                  { label: '月額固定費', value: '¥0', note: '完全無料', green: true },
                  { label: '登録費', value: '¥0', note: '完全無料', green: true },
                  { label: '退会費', value: '¥0', note: 'いつでも無料', green: true },
                  { label: 'テキストチャット', value: '15pt', note: '1通 ¥150相当', green: false },
                  { label: '写真の送受信', value: '15pt', note: '1枚 ¥150相当', green: false },
                  { label: '動画の送受信', value: '30pt', note: '1本 ¥300相当', green: false },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-surface)', borderRadius: '10px', border: '1px solid rgba(220,80,140,0.1)' }}>
                    <span style={{ fontSize: '16px', color: 'var(--color-text-muted)' }}>{row.label}</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '17px', fontWeight: 700, color: row.green ? '#7ec850' : 'var(--color-text)' }}>{row.value}</span>
                      <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginLeft: '8px' }}>{row.note}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>※ 1ポイント = ¥10（まとめ買いでボーナス付与）</p>
            </div>

            {/* ポイントパッケージ */}
            <div style={{ background: 'var(--color-bg)', border: '1px solid rgba(220,80,140,0.18)', borderRadius: '20px', padding: '28px', marginBottom: '24px' }}>
              <p style={{ fontWeight: 800, fontSize: '18px', marginBottom: '16px' }}>ポイント購入プラン（¥1,000〜）</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { price: '¥1,000', pt: '100pt', bonus: '', popular: false },
                  { price: '¥3,000', pt: '330pt', bonus: '+10%ボーナス', popular: false },
                  { price: '¥5,000', pt: '550pt', bonus: '+10%ボーナス', popular: false },
                  { price: '¥10,000', pt: '1,150pt', bonus: '+15%ボーナス', popular: true },
                  { price: '¥30,000', pt: '3,600pt', bonus: '+20%ボーナス', popular: false },
                  { price: '¥50,000', pt: '6,500pt', bonus: '+30%ボーナス', popular: false },
                ].map(pkg => (
                  <div key={pkg.price} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: pkg.popular ? 'rgba(232,67,143,0.06)' : 'var(--color-surface)', borderRadius: '10px', border: pkg.popular ? '1px solid rgba(232,67,143,0.35)' : '1px solid rgba(220,80,140,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '17px', fontWeight: 700 }}>{pkg.price}</span>
                      {pkg.popular && <span style={{ fontSize: '11px', fontWeight: 700, color: '#e8438f', background: 'rgba(232,67,143,0.12)', padding: '2px 8px', borderRadius: '99px' }}>人気No.1</span>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '17px', fontWeight: 700 }}>{pkg.pt}</span>
                      {pkg.bonus && <span style={{ fontSize: '13px', color: '#e8438f', marginLeft: '8px', fontWeight: 600 }}>{pkg.bonus}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <LpCtaButton href={ctaHref} lpName="lp_60s" className="btn-cta" style={{ display: 'block', textAlign: 'center', padding: '22px', fontSize: '20px', borderRadius: '16px', textDecoration: 'none', fontWeight: 800 }}>
              無料で始める →
            </LpCtaButton>
          </AnimateOnScroll>
        </div>
      </section>

      {/* ── 使い方3ステップ ── */}
      <section style={{ padding: '72px 28px', background: 'var(--color-bg)' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <AnimateOnScroll>
            <h2 style={{ textAlign: 'center', fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 900, marginBottom: '12px', lineHeight: 1.3 }}>
              始め方は、たったの3ステップ
            </h2>
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '17px', marginBottom: '40px' }}>
              スマートフォンだけあれば大丈夫です
            </p>
          </AnimateOnScroll>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { step: '01', title: 'メールアドレスで登録', desc: '本名や住所は不要。メールアドレスだけで30秒で完了します。' },
              { step: '02', title: '話し相手を選ぶ', desc: '個性豊かな女性たちから、気の合いそうな相手を選んでみてください。' },
              { step: '03', title: '話しかけてみる', desc: 'あいさつだけでも大丈夫。すぐに返事が来ます。' },
            ].map((s, i) => (
              <AnimateOnScroll key={s.step} delay={i * 80}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', background: 'var(--color-surface)', borderRadius: '20px', padding: '24px', border: '1px solid rgba(220,80,140,0.12)' }}>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#e8438f', minWidth: '44px', lineHeight: 1 }}>{s.step}</div>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: '20px', marginBottom: '6px' }}>{s.title}</p>
                    <p style={{ fontSize: '16px', lineHeight: 1.8, color: 'var(--color-text-muted)' }}>{s.desc}</p>
                  </div>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: '72px 28px', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <AnimateOnScroll>
            <h2 style={{ textAlign: 'center', fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 900, marginBottom: '40px', lineHeight: 1.3 }}>
              よくあるご質問
            </h2>
          </AnimateOnScroll>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              {
                q: 'スマートフォンが苦手でも使えますか？',
                a: 'はい、大丈夫です。LINEのようにメッセージを打つだけ。難しい操作はありません。ブラウザ（インターネット）が使えれば、すぐ始められます。',
              },
              {
                q: 'アプリをインストールしないといけませんか？',
                a: 'インストール不要です。スマートフォンのブラウザ（Safari・Chrome）でアクセスするだけ。アプリ一覧に表示されません。',
              },
              {
                q: '家族に見られませんか？',
                a: 'チャット履歴は外部に共有されません。ブラウザを閉じるか、シークレットモードで使えば、スマートフォンに何も残りません。',
              },
              {
                q: '月々いくらかかりますか？',
                a: '月額料金はありません。ポイント制なので、使った分だけ費用がかかります。テキストチャットは1通15pt（¥150相当）、写真・動画の送受信もポイントを使います。登録時に60ポイント（¥600相当）が無料でもらえます。',
              },
              {
                q: 'やめたいときはどうすればいいですか？',
                a: 'いつでも退会できます。解約金・違約金は一切かかりません。退会ボタンを押すだけで完了です。',
              },
              {
                q: 'AIと話しているのはわかりますか？',
                a: 'AIおよび当社の応答システムが会話相手です。非常に自然な会話ができます。あなたの会話内容は、サービス改善以外の目的で第三者に開示しません。価値判断をせず、いつでも話を聞きます。',
              },
            ].map((faq, i) => (
              <AnimateOnScroll key={i} delay={i * 60}>
                <details style={{ background: 'var(--color-bg)', border: '1px solid rgba(220,80,140,0.15)', borderRadius: '16px', overflow: 'hidden' }}>
                  <summary style={{ padding: '20px 24px', fontSize: '18px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', listStyle: 'none', userSelect: 'none' }}>
                    <span>{faq.q}</span>
                    <ChevronDown size={20} color="#e8438f" style={{ flexShrink: 0, marginLeft: '12px' }} />
                  </summary>
                  <div style={{ padding: '0 24px 20px', fontSize: '17px', lineHeight: 1.9, color: 'var(--color-text-muted)', borderTop: '1px solid rgba(220,80,140,0.1)' }}>
                    <div style={{ paddingTop: '16px' }}>{faq.a}</div>
                  </div>
                </details>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ── 最終CTA ── */}
      <section style={{ position: 'relative', overflow: 'hidden', background: 'var(--color-bg)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(232,67,143,0.12) 0%, transparent 70%)' }} />
        <AnimateOnScroll style={{ position: 'relative', zIndex: 10, padding: '80px 28px', textAlign: 'center', maxWidth: '560px', margin: '0 auto' }}>
          <p style={{ color: '#f472b6', fontSize: '16px', fontWeight: 600, marginBottom: '16px', letterSpacing: '0.1em' }}>✦ 今夜、話してみませんか</p>
          <h2 style={{ fontSize: 'clamp(26px, 6vw, 42px)', fontWeight: 900, marginBottom: '16px', lineHeight: 1.3, color: 'var(--color-text)' }}>
            あなたの話を聞きたい<br />女性たちが待っています
          </h2>
          <p style={{ fontSize: '18px', color: 'var(--color-text-muted)', marginBottom: '36px', lineHeight: 1.8 }}>
            アプリ不要・月額なし・履歴残らない。<br />
            登録するだけで<span style={{ color: '#fcd34d', fontWeight: 700 }}>60ポイント（¥600相当）</span>が無料でもらえます。
          </p>
          <LpCtaButton href={ctaHref} lpName="lp_60s" className="btn-cta" style={{ display: 'inline-block', padding: '24px 64px', fontSize: '22px', borderRadius: '18px', textDecoration: 'none', fontWeight: 900 }}>
            {ctaText}
          </LpCtaButton>
          <p style={{ fontSize: '15px', color: 'var(--color-text-muted)', marginTop: '16px' }}>
            🔒 登録無料・本名不要・いつでも退会できます
          </p>
        </AnimateOnScroll>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(220,80,140,0.1)', padding: '32px 24px', background: 'var(--color-bg)' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <span style={{ fontWeight: 800, fontSize: '18px', background: 'linear-gradient(90deg, #e8438f, #a060e0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AiKano</span>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <a href="mailto:info@aikano.chat" style={{ color: 'var(--color-text-muted)', fontSize: '14px', textDecoration: 'none' }}>お問い合わせ</a>
              {[
                { label: '特定商取引法', href: '/legal/tokusho' },
                { label: 'プライバシー', href: '/legal/privacy' },
                { label: '利用規約', href: '/legal/terms' },
              ].map(l => (
                <Link key={l.label} href={l.href} style={{ color: 'var(--color-text-muted)', fontSize: '14px', textDecoration: 'none' }}>{l.label}</Link>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(220,80,140,0.06)', paddingTop: '20px', marginTop: '4px' }}>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', lineHeight: 1.9 }}>
              運営会社：合同会社TJYM　／　〒530-0001 大阪府大阪市北区梅田一丁目２番２号 大阪駅前第２ビル１２－１２<br />
              <a href="https://tjym.org" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>tjym.org</a>　／　info@tjym.org
            </p>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '12px' }}>© 2026 AiKano　|　本サービスはAIキャラクターによる会話サービスです</p>
          </div>
        </div>
      </footer>

    </main>
  )
}
