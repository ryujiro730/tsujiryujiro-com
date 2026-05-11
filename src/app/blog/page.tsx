import { getAllPosts, CATEGORY_LABELS, BlogCategory } from '@/lib/blog'
import { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { BlogCard } from '@/components/blog/BlogCard'
import { CategoryTabs } from '@/components/blog/CategoryTabs'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://aikano.chat'

export const metadata: Metadata = {
  title: 'ブログ | AiKano',
  description: 'AiKanoの最新情報、使い方ガイド、AIとの会話を楽しむためのコラムをお届けします。',
  alternates: {
    canonical: `${APP_URL}/blog`,
  },
  openGraph: {
    title: 'ブログ | AiKano',
    description: 'AiKanoの最新情報、使い方ガイド、AIとの会話を楽しむためのコラムをお届けします。',
    url: `${APP_URL}/blog`,
    siteName: 'AiKano',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ブログ | AiKano',
    description: 'AiKanoの最新情報、使い方ガイド、AIとの会話を楽しむためのコラムをお届けします。',
  },
}

export default function BlogPage({
  searchParams,
}: {
  searchParams: { category?: string }
}) {
  const allPosts = getAllPosts()
  const category = (searchParams.category ?? 'all') as BlogCategory
  const filtered = category === 'all'
    ? allPosts
    : allPosts.filter(p => p.category === category)

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,245,248,0.95)', borderBottom: '1px solid var(--color-border)', backdropFilter: 'blur(12px)' }}
        className="sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
            ← AiKano
          </Link>
          <span className="text-sm font-bold">ブログ</span>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">AiKano ブログ</h1>
          <p className="text-[var(--color-text-muted)] text-sm">
            お知らせ・使い方・AIとの会話を楽しむためのコラム
          </p>
        </div>

        {/* Category tabs */}
        <Suspense fallback={<div className="h-9 mb-6" />}>
          <CategoryTabs current={category} />
        </Suspense>

        {/* Posts grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-[var(--color-text-muted)] text-sm">
            記事がありません
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {filtered.map(post => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
