import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

type Props = {
  href: string
  title: string
  description?: string
  image?: string
}

export function NextLink({ href, title, description, image }: Props) {
  const isExternal = href.startsWith('http')
  return (
    <Link
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="not-prose group my-6 flex items-center gap-4 rounded-2xl p-4 transition-colors"
      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', display: 'flex', textDecoration: 'none' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
    >
      {image && (
        <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-white">
          <Image src={image} alt={title} width={80} height={80} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold leading-snug line-clamp-2" style={{ color: 'var(--color-text)' }}>{title}</p>
        {description && (
          <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>{description}</p>
        )}
      </div>
      <ArrowRight size={16} className="shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--color-primary)' }} />
    </Link>
  )
}
