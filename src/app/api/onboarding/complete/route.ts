import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/supabase/get-auth-user'

export async function POST(req: NextRequest) {
  const authClient = createServerClient()
  const user = await getAuthUser(authClient)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, age, gender } = await req.json()
  if (!name?.trim() || !age || !gender)
    return NextResponse.json({ error: 'name, age, gender are required' }, { status: 400 })
  if (parseInt(age) < 18)
    return NextResponse.json({ error: '18歳未満はご利用いただけません' }, { status: 400 })

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // プロフィール行の存在確認
  const { data: existing } = await adminClient
    .from('profiles').select('id').eq('id', user.id).single()

  if (!existing) {
    // 行がない場合は新規作成
    const { error: insertError } = await adminClient.from('profiles').insert({
      id: user.id,
      email: user.email ?? '',
      user_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
      role: 'user',
      points: 0,
      display_name: name.trim(),
      age: parseInt(age),
      gender,
    })
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // 行がある場合は onboarding フィールドのみ更新
  const { error } = await adminClient
    .from('profiles')
    .update({ display_name: name.trim(), age: parseInt(age), gender })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
