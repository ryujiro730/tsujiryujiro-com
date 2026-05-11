import Link from 'next/link'
import { PostMeta, CATEGORY_LABELS } from '@/lib/blog'
import { Clock, Calendar } from 'lucide-react'

export function BlogCard({ post }: { post: PostMeta }) {
  const label = CATEGORY_LABELS[post.category] ?? post.category

  return (
    <Link href={`/blog/${post.slug}`} className="block group">
      <div className="card p-5 h-full flex flex-col gap-3 group-hover:border-[var(--color-primary)] transition-colors duration-200">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(232,121,160,0.12)', color: 'var(--color-primary)' }}>
            {label}
          </span>
          <span className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
            <Clock size={10} />{post.readingMinutes}分
          </span>
        </div>

        <div className="flex-1">
          <h2 className="font-bold text-sm leading-snug line-clamp-2 mb-2 group-hover:text-[var(--color-primary)] transition-colors">
            {post.title}
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed line-clamp-3">
            {post.description}
          </p>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
          <Calendar size={11} />
          {new Date(post.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}
        </div>
      </div>
    </Link>
  )
}
