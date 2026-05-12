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
    <div className="blog-layout min-h-screen" style={{ background: '#fff' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8' }}
        className="sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm font-medium" style={{ color: '#e8438f' }}>
            ← AiKano
          </Link>
          <span className="text-sm font-semibold" style={{ color: '#1a1a1a', fontFamily: "'Noto Serif JP', serif" }}>
            ブログ
          </span>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-14">
        {/* Hero */}
        <div className="mb-12">
          <p className="text-xs font-semibold tracking-widest mb-3" style={{ color: '#e8438f', letterSpacing: '0.12em' }}>
            AIKANO BLOG
          </p>
          <h1 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: '2rem', fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.02em', lineHeight: 1.3, marginBottom: '0.6em' }}>
            AiKano ブログ
          </h1>
          <p style={{ color: '#888', fontSize: '14px', lineHeight: 1.7 }}>
            お知らせ・使い方・AIとの会話を楽しむためのコラム
          </p>
        </div>

        {/* Category tabs */}
        <Suspense fallback={<div className="h-9 mb-8" />}>
          <CategoryTabs current={category} />
        </Suspense>

        {/* Posts grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-24" style={{ color: '#aaa', fontSize: '14px' }}>
            記事がありません
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(post => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
