import { MetadataRoute } from 'next'
import { getAllPosts } from '@/lib/blog'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://aikano.chat'

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts().filter(p => !p.noindex)

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: APP_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${APP_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]

  const blogPages: MetadataRoute.Sitemap = posts.map(post => ({
    url: `${APP_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...blogPages]
}
