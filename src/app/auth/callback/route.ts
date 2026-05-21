import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${origin}/auth/login?error=confirmation_failed`)
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const admin = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        )

        // プロフィールが存在するか確認
        const { data: profile } = await admin
          .from('profiles')
          .select('age')
          .eq('id', user.id)
          .single()

        if (!profile) {
          // 新規ユーザー：スケルトンプロフィールを作成
          await admin.from('profiles').insert({
            id: user.id,
            email: user.email ?? '',
            user_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
            role: 'user',
            points: 0,
          })
          return NextResponse.redirect(`${origin}/onboarding`)
        }

        if (profile.age === null) {
          // プロフィールはあるがonboarding未完了
          return NextResponse.redirect(`${origin}/onboarding`)
        }
      }
    } catch {}
  }

  return NextResponse.redirect(`${origin}/characters`)
}
