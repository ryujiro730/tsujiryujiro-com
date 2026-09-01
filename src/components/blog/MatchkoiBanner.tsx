type Variant = 'inline' | 'end' | 'sidebar' | 'list'

const BASE = 'https://matchkoi.com/lp/1'
const utm = (content: string) =>
  `${BASE}?utm_source=aikano&utm_medium=banner&utm_campaign=blog&utm_content=${content}`

export function MatchkoiBanner({ variant = 'inline' }: { variant?: Variant }) {
  if (variant === 'sidebar') {
    return (
      <a href={utm(variant)} target="_blank" rel="noopener noreferrer sponsored"
        style={{ display: 'block', borderRadius: '12px', overflow: 'hidden', textDecoration: 'none' }}>
        <p style={{ fontSize: '9px', color: '#aaa', letterSpacing: '0.12em', fontWeight: 700, textAlign: 'center', marginBottom: '4px' }}>PR・広告</p>
        <img
          src="/banners/matchkoi-portrait.png"
          alt="マチコイ — 無料登録で始める"
          style={{ width: '100%', display: 'block', borderRadius: '12px' }}
        />
      </a>
    )
  }

  if (variant === 'list') {
    return (
      <a href={utm(variant)} target="_blank" rel="noopener noreferrer sponsored"
        style={{ display: 'block', borderRadius: '16px', overflow: 'hidden', textDecoration: 'none' }}>
        <p style={{ fontSize: '9px', color: '#aaa', letterSpacing: '0.12em', fontWeight: 700, marginBottom: '4px' }}>PR・広告</p>
        <img
          src="/banners/matchkoi-square.png"
          alt="マチコイ — 無料登録で始める"
          style={{ width: '100%', display: 'block', borderRadius: '12px' }}
        />
      </a>
    )
  }

  // inline・end 共通（横長バナー）
  return (
    <div style={{ margin: variant === 'end' ? '40px 0' : '24px 0 32px' }}>
      <p style={{ fontSize: '9px', color: '#aaa', letterSpacing: '0.12em', fontWeight: 700, marginBottom: '4px' }}>PR・広告</p>
      <a href={utm(variant)} target="_blank" rel="noopener noreferrer sponsored"
        style={{ display: 'block', borderRadius: '12px', overflow: 'hidden', textDecoration: 'none' }}>
        <img
          src="/banners/matchkoi-wide.png"
          alt="マチコイ — 無料登録で始める"
          style={{ width: '100%', display: 'block' }}
        />
      </a>
    </div>
  )
}
