import Link from 'next/link'
import { getAllPosts, CATEGORY_LABELS } from '@/lib/blog'

export function RelatedPosts({ currentSlug }: { currentSlug: string }) {
  const all = getAllPosts().filter(p => p.slug !== currentSlug)

  // 同カテゴリ優先、足りなければ他で補完
  const current = getAllPosts().find(p => p.slug === currentSlug)
  const sameCategory = all.filter(p => p.category === current?.category)
  const others = all.filter(p => p.category !== current?.category)
  const posts = [...sameCategory, ...others].slice(0, 3)

  if (posts.length === 0) return null

  return (
    <section style={{ marginTop: '64px', paddingTop: '48px', borderTop: '1px solid #ececec' }}>
      <h2 style={{
        textAlign: 'center', fontFamily: "'Noto Serif JP', serif",
        fontSize: '1.5rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '32px',
      }}>
        関連記事
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '24px',
      }}>
        {posts.map(post => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            style={{ textDecoration: 'none', display: 'block' }}
          >
            <article style={{ height: '100%' }}>
              <span style={{
                display: 'inline-block', fontSize: '11px', fontWeight: 600,
                color: '#e8438f', marginBottom: '10px', letterSpacing: '0.03em',
              }}>
                {CATEGORY_LABELS[post.category] ?? post.category}
              </span>
              <h3 style={{
                fontSize: '15px', fontWeight: 700, color: '#1a1a1a',
                lineHeight: 1.5, marginBottom: '8px',
                display: '-webkit-box', WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}
                className="hover:text-[#e8438f] transition-colors">
                {post.title}
              </h3>
              <p style={{
                fontSize: '13px', color: '#888', lineHeight: 1.65,
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {post.description}
              </p>
            </article>
          </Link>
        ))}
      </div>
    </section>
  )
}
