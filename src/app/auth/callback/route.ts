import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const base = APP_URL || origin
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${base}/auth/login?error=confirmation_failed`)
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
            user_code: String(Math.floor(100000 + Math.random() * 900000)),
            role: 'user',
            points: 0,
            last_login_at: new Date().toISOString(),
          })
          return NextResponse.redirect(`${base}/onboarding`)
        }

        // 既存ユーザー：最終ログイン日時を更新
        await admin.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', user.id)

        if (profile.age === null) {
          // プロフィールはあるがonboarding未完了
          return NextResponse.redirect(`${base}/onboarding`)
        }
      }
    } catch {}
  }

  return NextResponse.redirect(`${base}/characters`)
}
