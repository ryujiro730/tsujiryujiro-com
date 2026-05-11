import Link from 'next/link'
import { getAllPosts } from '@/lib/blog'

export function RelatedPosts({ currentSlug }: { currentSlug: string }) {
  const posts = getAllPosts()
    .filter(p => p.slug !== currentSlug)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)

  if (posts.length === 0) return null

  return (
    <section className="not-prose mt-12 pt-8" style={{ borderTop: '1px solid var(--color-border)' }}>
      <p className="text-xs font-bold tracking-widest mb-4" style={{ color: 'var(--color-primary)' }}>RELATED</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {posts.map(post => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group rounded-2xl p-4 transition-colors"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', textDecoration: 'none', display: 'block' }}
          >
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 inline-block"
              style={{ background: 'rgba(232,121,160,0.12)', color: 'var(--color-primary)' }}>
              {post.category}
            </span>
            <p className="text-sm font-bold leading-snug line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors" style={{ color: 'var(--color-text)' }}>
              {post.title}
            </p>
            <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
              {post.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
