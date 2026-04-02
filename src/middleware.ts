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

  // セッションクッキーの存在確認（ネットワーク不要）
  const { data: { session } } = await supabase.auth.getSession()

  // getUser()はgetSession()でセッションがある場合のみ呼ぶ（不要なネットワーク接続を避ける）
  // ネットワークエラーが起きてもセッションクッキーがあればログアウトさせない
  let isAuthenticated = !!session

  if (session) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      // getUser()が成功した場合のみ結果を使う。失敗してもisAuthenticated=trueを維持
      if (user === null) isAuthenticated = false
    } catch {
      // ECONNRESET等のネットワークエラー: セッションクッキーを信頼してisAuthenticated=trueのまま
    }
  }

  if (!isAuthenticated && isProtected && !isAdminPath) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL('/characters', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icons/.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
