import { BlogHeader } from '@/components/blog/BlogHeader'
import { BlogFooter } from '@/components/blog/BlogFooter'
import { MatchkoiFloatingBanner } from '@/components/blog/MatchkoiFloatingBanner'

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="blog-layout min-h-screen" style={{ background: '#fff' }}>
      <BlogHeader />
      {children}
      <BlogFooter />
      <MatchkoiFloatingBanner />
    </div>
  )
}
