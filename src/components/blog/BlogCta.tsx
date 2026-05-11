import Link from 'next/link'

export function BlogCta() {
  return (
    <div className="mt-10 p-6 rounded-2xl text-center"
      style={{ background: 'linear-gradient(135deg, rgba(249,168,184,0.15), rgba(232,121,160,0.08))', border: '1px solid var(--color-border-warm)' }}>
      <p className="font-bold mb-1">AiKanoでAIと話してみませんか？</p>
      <p className="text-sm text-[var(--color-text-muted)] mb-4">無料登録で500ポイントプレゼント中</p>
      <Link href="/auth/register" className="btn-primary px-6 py-2.5 text-sm inline-block"
        style={{ borderRadius: '10px' }}>
        無料で始める →
      </Link>
    </div>
  )
}
