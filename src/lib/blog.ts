import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import readingTime from 'reading-time'

const BLOG_DIR = path.join(process.cwd(), 'src/content/blog')

export type BlogCategory = 'all' | 'news' | 'howto' | 'column' | 'update'

export const CATEGORY_LABELS: Record<BlogCategory, string> = {
  all:    'すべて',
  news:   'お知らせ',
  howto:  '使い方',
  column: 'コラム',
  update: 'アップデート',
}

export type PostMeta = {
  slug: string
  title: string
  description: string
  date: string
  category: BlogCategory
  tags: string[]
  ogImage?: string
  noindex?: boolean
  readingMinutes: number
  author?: string
}

export type Post = PostMeta & {
  content: string
}

// gray-matter parses YAML dates as JS Date objects automatically
function parseDate(raw: unknown): string {
  if (!raw) return ''
  if (raw instanceof Date) return raw.toISOString().slice(0, 10)
  return String(raw).slice(0, 10)
}

function parseTags(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string') return raw.split(',').map(t => t.trim()).filter(Boolean)
  return []
}

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return []

  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.mdx'))

  const posts = files.map(file => {
    const slug = file.replace(/\.mdx$/, '')
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8')
    const { data, content } = matter(raw)
    const rt = readingTime(content)

    return {
      slug,
      title: data.title ?? '',
      description: data.description ?? '',
      date: parseDate(data.date),
      category: (data.category ?? 'column') as BlogCategory,
      tags: parseTags(data.tags),
      ogImage: data.ogImage,
      noindex: data.noindex ?? false,
      readingMinutes: Math.max(1, Math.ceil(rt.minutes)),
      author: data.author,
    } satisfies PostMeta
  })

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getPostBySlug(slug: string): Post | null {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`)
  if (!fs.existsSync(filePath)) return null

  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)
  const rt = readingTime(content)

  return {
    slug,
    title: data.title ?? '',
    description: data.description ?? '',
    date: parseDate(data.date),
    category: (data.category ?? 'column') as BlogCategory,
    tags: parseTags(data.tags),
    ogImage: data.ogImage,
    noindex: data.noindex ?? false,
    readingMinutes: Math.max(1, Math.ceil(rt.minutes)),
    author: data.author,
    content,
  }
}

export function getPrevNext(slug: string): { prev: PostMeta | null; next: PostMeta | null } {
  const posts = getAllPosts()
  const idx = posts.findIndex(p => p.slug === slug)
  return {
    prev: idx > 0 ? posts[idx - 1] : null,
    next: idx < posts.length - 1 ? posts[idx + 1] : null,
  }
}
