'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export function BlogHeader() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session)
    })
  }, [])

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(255,245,248,0.95)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(232,67,143,0.18)',
      padding: '0 20px', height: '56px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <Link href="/" style={{
        fontWeight: 800, fontSize: '18px',
        background: 'linear-gradient(90deg, #e8438f, #a060e0)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        textDecoration: 'none',
      }}>
        AiKano
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Link href="/blog" style={{ fontSize: '13px', color: '#888', fontWeight: 500, textDecoration: 'none' }}
          className="hover:text-[#e8438f] transition-colors hidden sm:block">
          ブログ
        </Link>
        {isLoggedIn ? (
          <Link href="/characters" style={{
            padding: '8px 18px', fontSize: '14px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #e8438f, #a060e0)',
            color: '#fff', fontWeight: 700, textDecoration: 'none',
          }}>
            アプリへ →
          </Link>
        ) : (
          <>
            <Link href="/auth/login" style={{
              padding: '8px 16px', fontSize: '14px', color: '#888',
              fontWeight: 500, textDecoration: 'none',
            }}
              className="hover:text-[#e8438f] transition-colors hidden sm:block">
              ログイン
            </Link>
            <Link href="/auth/register" style={{
              padding: '8px 18px', fontSize: '14px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #e8438f, #a060e0)',
              color: '#fff', fontWeight: 700, textDecoration: 'none',
            }}>
              無料登録
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
