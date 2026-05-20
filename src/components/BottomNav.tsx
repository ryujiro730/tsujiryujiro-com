'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, MessageCircle, ShoppingBag, Settings } from 'lucide-react'

const tabs = [
  { href: '/characters', icon: Users, label: 'キャラ' },
  { href: '/conversations', icon: MessageCircle, label: 'トーク' },
  { href: '/shop', icon: ShoppingBag, label: 'ショップ' },
  { href: '/settings', icon: Settings, label: '設定' },
]

export function BottomNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname()
  if (pathname === '/chat') return null

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(255, 245, 248, 0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--color-border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="max-w-2xl mx-auto flex" style={{ height: '56px' }}>
        {tabs.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          const hasBadge = href === '/conversations' && unreadCount > 0

          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-opacity active:opacity-60"
              style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
            >
              <span className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.6} />
                {hasBadge && (
                  <span
                    className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] rounded-full flex items-center justify-center"
                    style={{
                      background: 'var(--color-primary)',
                      color: 'white',
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '0 3px',
                      lineHeight: 1,
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
              <span style={{ fontSize: '10px', fontWeight: isActive ? 700 : 400, letterSpacing: '0.02em' }}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
