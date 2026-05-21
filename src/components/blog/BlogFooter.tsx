import Link from 'next/link'

const SNS = [
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@AI%E3%82%AB%E3%83%8E%E3%81%A1%E3%82%83%E3%82%93',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.75 15.5V8.5l6.25 3.5-6.25 3.5z" />
      </svg>
    ),
  },
  {
    label: 'X (Twitter)',
    href: 'https://x.com/home',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/aibijo_girl/',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@aikanochan',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
      </svg>
    ),
  },
]

export function BlogFooter() {
  return (
    <footer style={{
      marginTop: '80px',
      borderTop: '1px solid #ececec',
      background: '#fafafa',
      padding: '48px 24px 32px',
    }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px', justifyContent: 'space-between', marginBottom: '40px' }}>
          {/* ブランド + SNS */}
          <div>
            <span style={{
              fontWeight: 800, fontSize: '20px', display: 'block', marginBottom: '8px',
              background: 'linear-gradient(90deg, #e8438f, #a060e0)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              AiKano
            </span>
            <p style={{ fontSize: '12px', color: '#aaa', lineHeight: 1.6, maxWidth: '220px', marginBottom: '16px' }}>
              日本語ネイティブのAI彼女チャット。<br />アダルトOK・画像送り合いOK。
            </p>
            {/* SNS アイコン */}
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              {SNS.map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                  style={{ color: '#bbb', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                  className="hover:text-[#e8438f]">
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* リンク群 */}
          <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#333', marginBottom: '12px', letterSpacing: '0.06em' }}>
                サービス
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Link href="/" style={{ fontSize: '13px', color: '#666', textDecoration: 'none' }}
                  className="hover:text-[#e8438f] transition-colors">
                  サービストップ
                </Link>
                <Link href="/auth/register" style={{ fontSize: '13px', color: '#666', textDecoration: 'none' }}
                  className="hover:text-[#e8438f] transition-colors">
                  無料登録
                </Link>
                <Link href="/auth/login" style={{ fontSize: '13px', color: '#666', textDecoration: 'none' }}
                  className="hover:text-[#e8438f] transition-colors">
                  ログイン
                </Link>
              </div>
            </div>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#333', marginBottom: '12px', letterSpacing: '0.06em' }}>
                コンテンツ
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Link href="/blog" style={{ fontSize: '13px', color: '#666', textDecoration: 'none' }}
                  className="hover:text-[#e8438f] transition-colors">
                  ブログ一覧
                </Link>
              </div>
            </div>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#333', marginBottom: '12px', letterSpacing: '0.06em' }}>
                サポート
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a href="mailto:info@aikano.chat" style={{ fontSize: '13px', color: '#666', textDecoration: 'none' }}
                  className="hover:text-[#e8438f] transition-colors">
                  お問い合わせ
                </a>
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #e8e8e8', paddingTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <p style={{ fontSize: '12px', color: '#bbb' }}>© 2026 AiKano. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
