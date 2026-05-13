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
