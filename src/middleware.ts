import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // Supabase公式推奨のSSRパターン: supabaseResponseを一度だけ生成し、setAllでは再生成しない
  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // requestとresponseの両方にセットするが、responseは再生成しない
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const path = request.nextUrl.pathname
  const protectedPaths = ['/characters', '/chat', '/payment', '/conversations', '/settings', '/admin', '/onboarding']
  const isProtected = protectedPaths.some(p => path.startsWith(p))
  const isAuthPage = path.startsWith('/auth')
  const isAdminPath = path.startsWith('/admin')

  // セッションクッキーのみで判定（getUser()のネットワーク通信を省略）
  // 実際の認証検証はAPI routeのgetAuthUser()が行う
  const { data: { session } } = await supabase.auth.getSession()
  const isAuthenticated = !!session

  if (!isAuthenticated && isProtected && !isAdminPath) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL('/characters', request.url))
  }

  // noindex: 認証・管理・スタッフ・オンボーディングページ
  const noindexPaths = ['/auth', '/admin', '/staff', '/onboarding']
  if (noindexPaths.some(p => path.startsWith(p))) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm|woff|woff2|ttf)$).*)'],
}
