import Link from 'next/link'
import { ReactNode } from 'react'

export function InlineLink({ href, children }: { href: string; children: ReactNode }) {
  const isExternal = href.startsWith('http')
  return (
    <Link
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      style={{ color: 'var(--color-primary)', fontWeight: 600 }}
      className="underline underline-offset-2 hover:opacity-75 transition-opacity"
    >
      {children}
    </Link>
  )
}
