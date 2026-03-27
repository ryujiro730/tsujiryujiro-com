import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main style={{ background: '#fff', color: '#333', fontFamily: 'var(--font-body)' }}>

      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(126,200,80,0.22)',
        padding: '0 20px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontWeight: 700, fontSize: '16px', color: '#7ec850' }}>HumanChat</span>
        <a href="#" style={{
          background: '#e8834a', color: '#fff', padding: '10px 20px',
          borderRadius: '10px', fontWeight: 700, fontSize: '14px',
          textDecoration: 'none',
        }}>
          無料で始める
        </a>
      </nav>

      {/* ── Section 1: ファーストビュー ── */}
      <section style={{
        maxWidth: '560px', margin: '0 auto',
        padding: '72px 24px 64px', textAlign: 'center',
      }}>
        {/* バッジ */}
        <div style={{ animationDelay: '0.1s' }} className="lp-fadein">
          <span style={{
            display: 'inline-block',
            background: '#edf7e4', color: '#7ec850',
            padding: '6px 16px', borderRadius: '99px',
            fontSize: '14px', fontWeight: 500, marginBottom: '24px',
          }}>
            ✦ 本物の人間が、あなたの話を聞きます
          </span>
        </div>

        {/* h1 */}
        <h1 style={{ fontWeight: 700, lineHeight: 1.2, marginBottom: '16px' }}>
          <span className="lp-fadein" style={{ display: 'block', fontSize: 'clamp(2rem, 8vw, 3rem)', color: '#333', animationDelay: '0.3s' }}>
            今夜、
          </span>
          <span className="lp-fadein" style={{ display: 'block', fontSize: 'clamp(2rem, 8vw, 3rem)', color: '#7ec850', animationDelay: '0.65s' }}>
            話せる人がいる。
          </span>
        </h1>

        {/* サブコピー */}
        <p className="lp-fadein" style={{
          fontSize: '18px', lineHeight: 1.8, color: 'rgba(51,51,51,0.55)',
          marginBottom: '40px', animationDelay: '1s',
        }}>
          AIではなく、本物の人間が<br />
          あなたの話をしっかり聞きます。
        </p>

        {/* CTA */}
        <div className="lp-fadein" style={{ animationDelay: '1.35s' }}>
          <a href="#" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: '#e8834a', color: '#fff',
            padding: '18px 36px', borderRadius: '14px',
            fontSize: '18px', fontWeight: 700, textDecoration: 'none',
            boxShadow: '0 4px 18px rgba(232,131,74,0.35)',
            width: '100%', maxWidth: '320px', justifyContent: 'center',
          }}>
            LINEで無料で始める
          </a>
          <p style={{ fontSize: '13px', color: 'rgba(51,51,51,0.45)', marginTop: '12px' }}>
            登録無料・今すぐ話せます
          </p>
        </div>

        {/* トラスト */}
        <div className="lp-fadein" style={{
          display: 'flex', justifyContent: 'center', gap: '16px',
          marginTop: '32px', fontSize: '13px', color: 'rgba(51,51,51,0.45)',
          flexWrap: 'wrap', animationDelay: '1.6s',
        }}>
          {['🔒 個人情報を守ります', '👤 実在する人が返信', '💬 5通まで無料'].map(t => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </section>

      {/* ── Section 2: 3つの特徴 ── */}
      <section style={{ background: '#f7fcf2', padding: '64px 24px' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <p style={{ textAlign: 'center', color: '#7ec850', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
            HumanChatの特徴
          </p>
          <h2 style={{ textAlign: 'center', fontSize: '22px', fontWeight: 700, marginBottom: '40px', color: '#333' }}>
            だから、安心して話せます
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { icon: '👤', title: '本物の人間が返信', desc: 'AIは一切使用していません。実在するスタッフが、あなたのメッセージを読んで、心を込めて返信します。' },
              { icon: '🕐', title: '24時間いつでも話せる', desc: '夜中でも、早朝でも。気が向いたときにメッセージを送れます。返信はスタッフが確認次第お届けします。' },
              { icon: '🔒', title: '秘密は厳守', desc: 'お話の内容は外部に漏れることはありません。安心して、何でも話しかけてください。' },
            ].map((f) => (
              <div key={f.title} style={{
                background: '#fff', border: '1px solid rgba(126,200,80,0.22)',
                borderRadius: '16px', padding: '24px',
                display: 'flex', gap: '20px', alignItems: 'flex-start',
              }}>
                <div style={{
                  width: '52px', height: '52px', borderRadius: '14px',
                  background: '#edf7e4', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '24px', flexShrink: 0,
                }}>
                  {f.icon}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px', color: '#333' }}>{f.title}</p>
                  <p style={{ fontSize: '16px', lineHeight: 1.7, color: 'rgba(51,51,51,0.6)' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 3: 安心感 ── */}
      <section style={{ padding: '64px 24px', background: '#fff' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>

          {/* 声 */}
          <div style={{
            background: '#edf7e4',
            borderLeft: '4px solid #7ec850',
            borderRadius: '12px', padding: '24px', marginBottom: '48px',
          }}>
            <p style={{ fontSize: '17px', lineHeight: 1.8, color: '#333', marginBottom: '12px' }}>
              「子どもたちは忙しそうで、なかなか話しかけられなくて。<br />
              ここで話してから、少し気持ちが楽になりました。」
            </p>
            <p style={{ fontSize: '14px', color: 'rgba(51,51,51,0.5)' }}>— 68歳・女性</p>
          </div>

          {/* FAQ */}
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px', color: '#333' }}>
            よくある質問
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '48px' }}>
            {[
              { q: '本当に人間が返信しているんですか？', a: 'はい。AIは一切使用していません。弊社のスタッフが実際にメッセージを読み、返信しています。' },
              { q: '個人情報は安全ですか？', a: 'LINEアカウントのみで登録できます。氏名・住所・電話番号などは不要です。やり取りの内容は厳重に管理し、第三者への提供は一切行いません。' },
              { q: '返信はどのくらいで来ますか？', a: '通常、数時間以内にお返しします。深夜や早朝は翌朝になることもありますが、必ずお返しします。' },
            ].map((item, i) => (
              <div key={i} style={{
                background: '#f7fcf2', border: '1px solid rgba(126,200,80,0.22)',
                borderRadius: '14px', padding: '20px',
              }}>
                <p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px', color: '#333' }}>Q. {item.q}</p>
                <p style={{ fontSize: '16px', lineHeight: 1.7, color: 'rgba(51,51,51,0.6)' }}>{item.a}</p>
              </div>
            ))}
          </div>

          {/* 運営情報 */}
          <div style={{
            background: '#f7fcf2', border: '1px solid rgba(126,200,80,0.22)',
            borderRadius: '14px', padding: '20px',
            fontSize: '14px', color: 'rgba(51,51,51,0.55)', lineHeight: 2,
          }}>
            <p style={{ fontWeight: 700, color: '#333', marginBottom: '4px' }}>運営会社</p>
            <p>株式会社 ○○○○</p>
            <p>所在地：東京都○○区○○ ○-○-○</p>
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
              {[
                { label: 'プライバシーポリシー', href: '/legal/privacy' },
                { label: '利用規約', href: '/legal/terms' },
                { label: '特定商取引法', href: '/legal/tokusho' },
              ].map(l => (
                <Link key={l.label} href={l.href} style={{ color: '#7ec850', textDecoration: 'underline' }}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4: 最終CTA ── */}
      <section style={{ background: '#f7fcf2', padding: '80px 24px' }}>
        <div style={{ maxWidth: '360px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: '#7ec850', fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>
            今夜から始められます
          </p>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px', color: '#333' }}>
            まずは、話してみてください
          </h2>
          <p style={{ fontSize: '16px', lineHeight: 1.8, color: 'rgba(51,51,51,0.55)', marginBottom: '32px' }}>
            最初の5通は無料です。<br />
            登録はLINEだけ。30秒で始められます。
          </p>
          <a href="#" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            background: '#e8834a', color: '#fff',
            padding: '20px', borderRadius: '14px',
            fontSize: '20px', fontWeight: 700, textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(232,131,74,0.35)',
          }}>
            まずは無料で話してみる
          </a>
          <p style={{ fontSize: '13px', color: 'rgba(51,51,51,0.4)', marginTop: '16px' }}>
            🔒 個人情報は安全に管理します
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid rgba(126,200,80,0.22)',
        padding: '24px 20px', background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontWeight: 700, color: '#7ec850', fontSize: '14px' }}>HumanChat</span>
        <span style={{ fontSize: '12px', color: 'rgba(51,51,51,0.4)' }}>© 2025 HumanChat</span>
      </footer>

      <style>{`
        .lp-fadein {
          opacity: 0;
          transform: translateY(20px);
          animation: lpFadeIn 0.7s ease-out forwards;
        }
        @keyframes lpFadeIn {
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

    </main>
  )
}
