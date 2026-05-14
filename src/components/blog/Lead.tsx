type Props = { children: React.ReactNode }

export function Lead({ children }: Props) {
  return (
    <p className="not-prose" style={{
      textAlign: 'center',
      fontFamily: "'Noto Serif JP', serif",
      fontSize: '17px',
      fontWeight: 700,
      lineHeight: 1.9,
      color: '#1a1a1a',
      letterSpacing: '0.04em',
      padding: '24px 16px',
      borderTop: '2px solid #e8438f',
      borderBottom: '2px solid #e8438f',
      margin: '28px 0',
      background: 'linear-gradient(180deg, #fff 0%, #fff5f9 100%)',
      borderRadius: '2px',
    }}>
      {children}
    </p>
  )
}
