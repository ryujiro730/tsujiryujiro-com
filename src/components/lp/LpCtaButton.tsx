'use client'

import Link from 'next/link'
import { trackCtaClick } from '@/lib/gtag'

export function LpCtaButton({ href, children, lpName, style, className }: {
  href: string
  children: React.ReactNode
  lpName: string
  style?: React.CSSProperties
  className?: string
}) {
  return (
    <Link
      href={href}
      className={className}
      style={style}
      onClick={() => trackCtaClick({ location: lpName })}
    >
      {children}
    </Link>
  )
}
