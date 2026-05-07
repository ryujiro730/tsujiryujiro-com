import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)

    // プロフィール行を保証する（DBトリガーが機能していない環境に対応）
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const admin = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        )
        await admin.from('profiles').upsert({
          id: user.id,
          email: user.email ?? '',
          user_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
          role: 'user',
          points: 0,
        }, { onConflict: 'id', ignoreDuplicates: true })
      }
    } catch {}
  }

  return NextResponse.redirect(`${origin}/characters`)
}
