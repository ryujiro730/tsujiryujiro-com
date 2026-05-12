type Props = {
  children: React.ReactNode
  color?: string
  title?: string
}

export function Box({ children, color = '#e8438f', title }: Props) {
  return (
    <div style={{
      border: `2px solid ${color}`,
      borderRadius: '8px',
      padding: title ? '0' : '16px 20px',
      margin: '20px 0',
      overflow: 'hidden',
    }}>
      {title && (
        <div style={{ background: color, color: '#fff', fontWeight: 700, fontSize: '13px', padding: '6px 16px' }}>
          {title}
        </div>
      )}
      <div style={{ padding: title ? '14px 20px' : undefined }}>
        {children}
      </div>
    </div>
  )
}
