export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: '40vh' }}>
      <div style={{
        width: '28px', height: '28px',
        borderRadius: '50%',
        border: '3px solid var(--color-border)',
        borderTopColor: 'var(--color-primary)',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
