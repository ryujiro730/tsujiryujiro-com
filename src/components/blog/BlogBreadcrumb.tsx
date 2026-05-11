import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

type Crumb = { label: string; href?: string }

export function BlogBreadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="パンくずリスト" className="flex items-center flex-wrap gap-1 text-[11px] text-[var(--color-text-muted)] mb-6">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={10} className="shrink-0" />}
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-[var(--color-primary)] transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-[var(--color-text)] font-medium line-clamp-1 max-w-[200px] sm:max-w-xs">
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}
