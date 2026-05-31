'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

type NavItem = { href: string; label: string }

export function AdminNav({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // ページ遷移時に閉じる
  useEffect(() => { setOpen(false) }, [pathname])

  // スクロールロック
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap"
            style={{
              color: isActive(item.href) ? 'var(--color-primary)' : 'var(--color-text-muted)',
              background: isActive(item.href) ? 'var(--color-surface-2)' : 'transparent',
              fontWeight: isActive(item.href) ? 600 : 400,
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Mobile hamburger */}
      <button
        className="md:hidden p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        onClick={() => setOpen(true)}
        aria-label="メニューを開く"
      >
        <Menu size={20} />
      </button>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-[100] flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          {/* Drawer */}
          <div
            className="relative ml-auto w-64 h-full flex flex-col"
            style={{ background: 'var(--color-surface)', borderLeft: '1px solid var(--color-border-warm)' }}
          >
            <div className="flex items-center justify-between px-4 h-14 border-b" style={{ borderColor: 'var(--color-border-warm)' }}>
              <span className="text-sm font-semibold text-[var(--color-text-warm)]">メニュー</span>
              <button onClick={() => setOpen(false)} className="text-[var(--color-text-muted)]">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-1">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-4 py-3 rounded-xl text-sm transition-colors"
                  style={{
                    color: isActive(item.href) ? 'var(--color-primary)' : 'var(--color-text)',
                    background: isActive(item.href) ? 'var(--color-surface-2)' : 'transparent',
                    fontWeight: isActive(item.href) ? 600 : 400,
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
