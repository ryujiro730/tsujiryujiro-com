type Props = {
  title: string
  age: string
  gender?: '男性' | '女性'
  type?: '良い口コミ' | '悪い口コミ'
  children: React.ReactNode
}

export function Review({ title, age, gender = '男性', type = '良い口コミ', children }: Props) {
  const positive = type === '良い口コミ'
  const color = positive ? '#e8438f' : '#888'
  const bgColor = positive ? '#fff0f6' : '#f5f5f5'

  return (
    <div style={{
      border: '1px solid #e8e8e8',
      borderRadius: '10px',
      padding: '16px',
      margin: '16px 0',
      background: '#fff',
      display: 'flex',
      gap: '16px',
      alignItems: 'flex-start',
    }}>
      {/* 左：アバター */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '56px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: bgColor, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {gender === '女性' ? (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              <path d="M9 6.5c0 0 1-2 3-2s3 2 3 2" />
            </svg>
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          )}
        </div>
        <span style={{ fontSize: '10px', color: '#888', textAlign: 'center', lineHeight: 1.4 }}>{age} / {gender}</span>
      </div>

      {/* 右：内容 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* バッジ */}
        <span style={{
          display: 'inline-block',
          fontSize: '10px',
          fontWeight: 700,
          padding: '2px 10px',
          borderRadius: '4px',
          background: color,
          color: '#fff',
          marginBottom: '8px',
          letterSpacing: '0.03em',
        }}>
          {type}
        </span>

        {/* タイトル */}
        <p style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a1a', marginBottom: '8px', lineHeight: 1.4 }}>
          {title}
        </p>

        {/* 区切り線 */}
        <div style={{ borderTop: '1px dashed #e0e0e0', marginBottom: '10px' }} />

        {/* 本文 */}
        <div style={{ fontSize: '13px', color: '#444', lineHeight: 1.75 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
