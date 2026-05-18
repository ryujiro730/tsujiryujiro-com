import { getPostBySlug, getAllPosts, getPrevNext, CATEGORY_LABELS } from '@/lib/blog'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { ChevronLeft, ChevronRight, Clock, Calendar } from 'lucide-react'
import { AuthorSig, AuthorSigCompact, SatsukiAuthorSig, SatsukiAuthorSigCompact } from '@/components/blog/AuthorSig'
import { BlogCta } from '@/components/blog/BlogCta'
import BlogToc from '@/components/blog/BlogToc'
import { BlogBreadcrumb } from '@/components/blog/BlogBreadcrumb'
import { InlineLink } from '@/components/blog/InlineLink'
import { NextLink } from '@/components/blog/NextLink'
import { RelatedPosts } from '@/components/blog/RelatedPosts'
import { TwitterEmbed } from '@/components/blog/TwitterEmbed'
import { ComparisonTable } from '@/components/blog/ComparisonTable'
import type { ComparisonService } from '@/components/blog/ComparisonTable'
import { AiKanoHikakuTable } from '@/components/blog/AiKanoHikakuTable'
import { AiKanoCard, ChatGPTCard, GeminiCard, CandyAICard, CloverCard, ReplikaCard, CrushonCard, KindroidCard, MyDreamCompanionCard, DreamGFCard, CotomoCard, OzChatCard } from '@/components/blog/AiKanoRadarChart'
import { Box } from '@/components/blog/Box'
import { ImageGrid, GridImg, SizedImg } from '@/components/blog/ImageGrid'
import { Review } from '@/components/blog/Review'
import { FaqSection, FaqItem } from '@/components/blog/Faq'
import { Lead } from '@/components/blog/Lead'
import { HowToUseCompare1, HowToUseCompare2 } from '@/components/blog/HowToUseCompare'
import { EroMethodCompare } from '@/components/blog/EroMethodCompare'
import { JpAiHikakuTable } from '@/components/blog/JpAiHikakuTable'
import { MdxPre } from '@/components/blog/MdxPre'

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
  const ogImage = post.ogImage ?? `${APP_URL}/og-default.png`

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    image: ogImage,
    datePublished: post.date,
    author: {
      '@type': 'Person',
      name: post.author === 'satsuki' ? '千田さつき' : 'AiKano編集部',
    },
    publisher: {
      '@type': 'Organization',
      name: 'AiKano',
      logo: { '@type': 'ImageObject', url: `${APP_URL}/icons/icon-192.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${APP_URL}/blog/${params.slug}` },
  }

  return (
    <div className="blog-layout min-h-screen" style={{ background: '#fff' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8' }}
        className="sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link href="/blog" style={{ fontSize: '13px', color: '#888', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
            className="hover:text-[#1a1a1a] transition-colors">
            <ChevronLeft size={14} />ブログ
          </Link>
          <span style={{ color: '#ddd' }}>/</span>
          <span style={{ fontSize: '13px', color: '#bbb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <BlogBreadcrumb crumbs={[
          { label: 'ホーム', href: '/' },
          { label: 'ブログ', href: '/blog' },
          { label: post.title },
        ]} />

        {/* Post header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 12px', borderRadius: '99px', background: '#fff0f6', color: '#e8438f', letterSpacing: '0.03em' }}>
              {categoryLabel}
            </span>
          </div>
          <h1 className="blog-title" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', marginBottom: '16px', color: '#1a1a1a' }}>
            {post.title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '12px', color: '#aaa' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Calendar size={12} />
              {new Date(post.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Clock size={12} />
              約{post.readingMinutes}分で読めます
            </span>
          </div>
          {post.description && (
            <p style={{ marginTop: '20px', fontSize: '14px', lineHeight: 1.75, padding: '16px 20px', borderRadius: '10px', background: '#fafafa', borderLeft: '3px solid #e8438f', color: '#666' }}>
              {post.description}
            </p>
          )}
        </div>

        {/* Author compact（上部） */}
        {post.author === 'satsuki' ? <SatsukiAuthorSigCompact date={post.date} /> : <AuthorSigCompact date={post.date} />}

        <BlogToc />

        {/* Article body */}
        <article className="prose prose-sm sm:prose max-w-none blog-prose" style={{ maxWidth: 'none' }}>
          <MDXRemote
            source={post.content}
            components={{ BlogCta, InlineLink, NextLink, RelatedPosts: () => <RelatedPosts currentSlug={post.slug} />, TwitterEmbed, ComparisonTable, AiKanoHikakuTable, JpAiHikakuTable, AiKanoCard, ChatGPTCard, GeminiCard, CandyAICard, CloverCard, ReplikaCard, CrushonCard, KindroidCard, MyDreamCompanionCard, DreamGFCard, CotomoCard, OzChatCard, Box, Review, ImageGrid, GridImg, SizedImg, FaqSection, FaqItem, Lead, HowToUseCompare1, HowToUseCompare2, EroMethodCompare, pre: MdxPre }}
            options={{
              mdxOptions: {
                remarkPlugins: [remarkGfm, remarkBreaks],
              },
            }}
          />
        </article>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #ececec' }}>
            {post.tags.map(tag => (
              <span key={tag} style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '99px', background: '#f5f5f5', color: '#888', border: '1px solid #e8e8e8' }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Author */}
        {post.author === 'satsuki' ? <SatsukiAuthorSig /> : <AuthorSig />}

        {/* CTA */}
        <BlogCta />

        {/* Prev / Next */}
        {(prev || next) && (
          <div style={{ display: 'grid', gap: '12px', marginTop: '32px', gridTemplateColumns: prev && next ? '1fr 1fr' : '1fr' }}>
            {prev && (
              <Link href={`/blog/${prev.slug}`}
                style={{ display: 'block', padding: '16px', borderRadius: '10px', border: '1px solid #ececec', textDecoration: 'none', transition: 'border-color 0.2s' }}
                className="group hover:border-[#e8438f]">
                <p style={{ fontSize: '11px', color: '#bbb', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ChevronLeft size={12} />新しい記事
                </p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#333', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  className="group-hover:text-[#e8438f] transition-colors">
                  {prev.title}
                </p>
              </Link>
            )}
            {next && (
              <Link href={`/blog/${next.slug}`}
                style={{ display: 'block', padding: '16px', borderRadius: '10px', border: '1px solid #ececec', textDecoration: 'none', textAlign: 'right', marginLeft: 'auto', width: '100%', transition: 'border-color 0.2s' }}
                className="group hover:border-[#e8438f]">
                <p style={{ fontSize: '11px', color: '#bbb', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                  古い記事<ChevronRight size={12} />
                </p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#333', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  className="group-hover:text-[#e8438f] transition-colors">
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
