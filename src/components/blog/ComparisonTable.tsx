'use client'

export type ComparisonService = {
  rank: number
  name: string
  image?: string
  tagline?: string
  ctaLabel?: string
  ctaHref?: string
  score: number
  fields: Record<string, string>
}

type Props = {
  title: string
  rowLabels: string[]
  services: ComparisonService[]
}

const RANK_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: '#fff9e6', text: '#b8860b', border: '#f0c040' },
  2: { bg: '#f5f5f5', text: '#666', border: '#bbb' },
  3: { bg: '#fff4ee', text: '#c0602a', border: '#e0905a' },
}
const DEFAULT_RANK = { bg: '#f0f4ff', text: '#4455aa', border: '#aabbdd' }

export function ComparisonTable({ title, rowLabels, services }: Props) {
  const LABEL_W = 120
  const COL_W = 160

  return (
    <div className="not-prose my-8" style={{ fontSize: '13px' }}>
      {/* タイトル */}
      <div style={{
        background: 'linear-gradient(90deg, #1a2a5e, #2a4a9e)',
        color: '#fff', fontWeight: 800, padding: '10px 16px',
        borderRadius: '8px 8px 0 0', fontSize: '14px',
      }}>
        {title}【横にスライドできます】
      </div>

      {/* スクロールラッパー */}
      <div style={{ overflowX: 'auto', border: '2px solid #1a2a5e', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
        <table style={{
          borderCollapse: 'collapse',
          minWidth: LABEL_W + COL_W * services.length,
          width: '100%',
          tableLayout: 'fixed',
        }}>
          {/* col widths */}
          <colgroup>
            <col style={{ width: LABEL_W }} />
            {services.map((_, i) => <col key={i} style={{ width: COL_W }} />)}
          </colgroup>

          <tbody>
            {/* ランキングヘッダー行 */}
            <tr>
              <td style={{ ...cellBase, background: '#f8f8f8', borderRight: '2px solid #1a2a5e' }} />
              {services.map(s => {
                const c = RANK_COLORS[s.rank] ?? DEFAULT_RANK
                return (
                  <td key={s.rank} style={{ ...cellBase, background: c.bg, borderRight: '1px solid #ddd', textAlign: 'center', padding: '10px 8px' }}>
                    <div style={{ display: 'inline-block', border: `2px solid ${c.border}`, borderRadius: 4, padding: '1px 8px', color: c.text, fontWeight: 700, fontSize: 12, marginBottom: 6 }}>
                      {s.rank}位
                    </div>
                    {s.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.image} alt={s.name} style={{ display: 'block', margin: '0 auto 6px', maxHeight: 60, maxWidth: 140, objectFit: 'contain' }} />
                    )}
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#222', marginBottom: 4 }}>{s.name}</div>
                    {s.tagline && <div style={{ fontSize: 11, color: '#666' }}>{s.tagline}</div>}
                    {s.ctaHref && (
                      <a href={s.ctaHref} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-block', marginTop: 8, padding: '4px 14px', borderRadius: 4, background: '#e8438f', color: '#fff', fontWeight: 700, fontSize: 12, textDecoration: 'none' }}>
                        {s.ctaLabel ?? '詳しくみる'}
                      </a>
                    )}
                  </td>
                )
              })}
            </tr>

            {/* データ行 */}
            {rowLabels.map((label, ri) => (
              <tr key={label} style={{ background: ri % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ ...cellBase, background: '#f0f4f8', fontWeight: 700, borderRight: '2px solid #1a2a5e', padding: '10px 8px', color: '#333', lineHeight: 1.4, whiteSpace: 'nowrap' }}>
                  {label}
                </td>
                {services.map(s => (
                  <td key={s.rank} style={{ ...cellBase, borderRight: '1px solid #ddd', textAlign: 'center', padding: '10px 8px', color: '#222', lineHeight: 1.5 }}>
                    {s.fields[label] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}

            {/* 詳細ボタン行 */}
            <tr style={{ background: '#f8f8f8' }}>
              <td style={{ ...cellBase, background: '#f0f4f8', fontWeight: 700, borderRight: '2px solid #1a2a5e', padding: '10px 8px', color: '#333' }}>
                詳細ページ
              </td>
              {services.map(s => (
                <td key={s.rank} style={{ ...cellBase, borderRight: '1px solid #ddd', textAlign: 'center', padding: '10px 8px' }}>
                  {s.ctaHref ? (
                    <a href={s.ctaHref} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 4, background: '#e8438f', color: '#fff', fontWeight: 700, fontSize: 12, textDecoration: 'none' }}>
                      {s.ctaLabel ?? '詳しくみる'}
                    </a>
                  ) : '—'}
                </td>
              ))}
            </tr>

            {/* 総合得点行 */}
            <tr style={{ background: '#fff9e6' }}>
              <td style={{ ...cellBase, background: '#f0f4f8', fontWeight: 700, borderRight: '2px solid #1a2a5e', padding: '10px 8px', color: '#333' }}>
                総合得点
              </td>
              {services.map(s => {
                const c = RANK_COLORS[s.rank] ?? DEFAULT_RANK
                return (
                  <td key={s.rank} style={{ ...cellBase, borderRight: '1px solid #ddd', textAlign: 'center', padding: '10px 8px', fontWeight: 800, fontSize: 15, color: c.text }}>
                    {s.score} 点
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

const cellBase: React.CSSProperties = {
  border: 'none',
  borderBottom: '1px solid #e8e8e8',
  verticalAlign: 'middle',
}
