type Props = {
  children: React.ReactNode
  cols?: number
}

export function ImageGrid({ children, cols = 2 }: Props) {
  return (
    <div className="not-prose" style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: '10px',
      width: '100%',
      margin: '20px 0',
    }}>
      {children}
    </div>
  )
}

export function GridImg({ src, alt }: { src: string; alt?: string }) {
  return (
    <div style={{ width: '100%', aspectRatio: '1 / 1', overflow: 'hidden', borderRadius: '12px' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>
  )
}

// 高さを指定して表示するコンポーネント（スマホスクショなど）
export function SizedImg({ src, alt, height = 300, maxWidth, position = 'top' }: {
  src: string
  alt?: string
  height?: number
  maxWidth?: number
  position?: string
}) {
  return (
    <div className="not-prose" style={{
      height,
      maxWidth: maxWidth ? `${maxWidth}px` : '100%',
      margin: '20px auto',
      overflow: 'hidden',
      borderRadius: '12px',
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: position, display: 'block' }} />
    </div>
  )
}
