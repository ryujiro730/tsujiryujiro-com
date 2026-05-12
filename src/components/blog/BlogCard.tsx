'use client'

import Link from 'next/link'
import type { PostMeta } from '@/lib/blog'
import { Clock, Calendar } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  news: 'お知らせ',
  howto: '使い方',
  column: 'コラム',
  update: 'アップデート',
}

export function BlogCard({ post }: { post: PostMeta }) {
  const label = CATEGORY_LABELS[post.category] ?? post.category

  return (
    <Link href={`/blog/${post.slug}`} className="block group">
      <div style={{
        background: '#fff',
        border: '1px solid #ececec',
        borderRadius: '12px',
        padding: '24px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = '#e8438f'
          el.style.boxShadow = '0 4px 20px rgba(232,67,143,0.1)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = '#ececec'
          el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'
        }}
      >
        <div className="flex items-center justify-between">
          <span style={{
            fontSize: '11px', fontWeight: 700, padding: '3px 10px',
            borderRadius: '99px', background: '#fff0f6', color: '#e8438f',
            letterSpacing: '0.03em',
          }}>
            {label}
          </span>
          <span style={{ fontSize: '11px', color: '#bbb', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={10} />{post.readingMinutes}分
          </span>
        </div>

        <div style={{ flex: 1 }}>
          <h2 style={{
            fontFamily: "'Noto Serif JP', serif",
            fontWeight: 700,
            fontSize: '15px',
            lineHeight: 1.5,
            color: '#1a1a1a',
            marginBottom: '8px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            transition: 'color 0.2s',
          }}
            className="group-hover:text-[#e8438f]"
          >
            {post.title}
          </h2>
          <p style={{
            fontSize: '12px', color: '#999', lineHeight: 1.7,
            display: '-webkit-box', WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {post.description}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#bbb' }}>
          <Calendar size={11} />
          {new Date(post.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}
        </div>
      </div>
    </Link>
  )
}
