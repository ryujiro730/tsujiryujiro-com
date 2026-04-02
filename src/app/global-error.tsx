'use client'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body style={{ background: '#0d0a14', color: '#f2eafa', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', padding: '0 16px', maxWidth: '360px' }}>
          <p style={{ fontSize: '40px', marginBottom: '16px' }}>😔</p>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>エラーが発生しました</h1>
          <p style={{ color: 'rgba(242,234,250,0.45)', fontSize: '14px', marginBottom: '24px' }}>
            ページの読み込みに失敗しました。
          </p>
          {error?.message && (
            <p style={{ fontSize: '11px', color: 'rgba(242,234,250,0.4)', fontFamily: 'monospace', background: '#1e1530', padding: '8px 12px', borderRadius: '8px', marginBottom: '16px', wordBreak: 'break-all' }}>
              {error.message}
            </p>
          )}
          <button
            onClick={reset}
            style={{ background: '#e8438f', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '14px', cursor: 'pointer' }}
          >
            再読み込み
          </button>
        </div>
      </body>
    </html>
  )
}
