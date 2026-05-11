import { getPostBySlug, getAllPosts, getPrevNext, CATEGORY_LABELS } from '@/lib/blog'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { ChevronLeft, ChevronRight, Clock, Calendar } from 'lucide-react'
import { AuthorSig } from '@/components/blog/AuthorSig'
import { BlogCta } from '@/components/blog/BlogCta'
import BlogToc from '@/components/blog/BlogToc'
import { BlogBreadcrumb } from '@/components/blog/BlogBreadcrumb'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://aikano.chat'

export async function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const post = getPostBySlug(params.slug)
  if (!post) return {}

  const ogImage = post.ogImage ?? `${APP_URL}/og-default.png`

  return {
    title: `${post.title} | AiKano`,
    description: post.description,
    ...(post.noindex && { robots: { index: false } }),
    alternates: {
      canonical: `${APP_URL}/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `${APP_URL}/blog/${post.slug}`,
      siteName: 'AiKano',
      locale: 'ja_JP',
      type: 'article',
      publishedTime: post.date,
      tags: post.tags,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [ogImage],
    },
  }
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug)
  if (!post) notFound()

  const { prev, next } = getPrevNext(params.slug)
  const categoryLabel = CATEGORY_LABELS[post.category] ?? post.category

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,245,248,0.95)', borderBottom: '1px solid var(--color-border)', backdropFilter: 'blur(12px)' }}
        className="sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/blog" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors flex items-center gap-1">
            <ChevronLeft size={15} />ブログ
          </Link>
          <span className="text-[var(--color-border)]">/</span>
          <span className="text-sm truncate text-[var(--color-text-muted)]">{post.title}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <BlogBreadcrumb crumbs={[
          { label: 'ホーム', href: '/' },
          { label: 'ブログ', href: '/blog' },
          { label: post.title },
        ]} />

        {/* Post header */}
        <div className="mb-8">
          <div className="mb-3">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(232,121,160,0.12)', color: 'var(--color-primary)' }}>
              {categoryLabel}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold leading-snug mb-4">{post.title}</h1>
          <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {new Date(post.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              約{post.readingMinutes}分で読めます
            </span>
          </div>
          {post.description && (
            <p className="mt-5 text-sm leading-relaxed px-4 py-3 rounded-xl"
              style={{ background: 'var(--color-surface-2)', borderLeft: '3px solid var(--color-primary)', color: 'var(--color-text-muted)' }}>
              {post.description}
            </p>
          )}
        </div>

        {/* Author */}
        <AuthorSig />

        <BlogToc />

        {/* Article body */}
        <article className="prose prose-sm sm:prose max-w-none blog-prose">
          <MDXRemote
            source={post.content}
            components={{ BlogCta }}
            options={{
              mdxOptions: {
                remarkPlugins: [remarkGfm, remarkBreaks],
              },
            }}
          />
        </article>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8 pt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
            {post.tags.map(tag => (
              <span key={tag} className="text-xs px-2.5 py-1 rounded-full"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Author */}
        <AuthorSig />

        {/* CTA */}
        <BlogCta />

        {/* Prev / Next */}
        {(prev || next) && (
          <div className="grid gap-3 mt-8" style={{ gridTemplateColumns: prev && next ? '1fr 1fr' : '1fr' }}>
            {prev && (
              <Link href={`/blog/${prev.slug}`}
                className="card p-4 hover:border-[var(--color-primary)] transition-colors group">
                <p className="text-xs text-[var(--color-text-muted)] mb-1 flex items-center gap-1">
                  <ChevronLeft size={12} />新しい記事
                </p>
                <p className="text-sm font-medium line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors">
                  {prev.title}
                </p>
              </Link>
            )}
            {next && (
              <Link href={`/blog/${next.slug}`}
                className="card p-4 hover:border-[var(--color-primary)] transition-colors group text-right ml-auto w-full">
                <p className="text-xs text-[var(--color-text-muted)] mb-1 flex items-center gap-1 justify-end">
                  古い記事<ChevronRight size={12} />
                </p>
                <p className="text-sm font-medium line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors">
                  {next.title}
                </p>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
