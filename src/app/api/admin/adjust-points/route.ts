export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/supabase/get-auth-user'

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  const supabase = createClient()
  const user = await getAuthUser(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!callerProfile || callerProfile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, amount, description } = await request.json()
  if (!userId || typeof amount !== 'number' || amount === 0) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  const admin = getAdmin()

  // 現在のポイント取得
  const { data: profile, error: fetchErr } = await admin
    .from('profiles').select('points').eq('id', userId).single()
  if (fetchErr || !profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const newPoints = Math.max(0, profile.points + amount)

  // ポイント更新 + トランザクション記録を並列（amountは符号付きで保存）
  const [{ error: updateErr }, { error: txErr }] = await Promise.all([
    admin.from('profiles').update({ points: newPoints }).eq('id', userId),
    admin.from('point_transactions').insert({
      user_id: userId,
      amount,  // 正: 付与、負: 減算
      type: 'admin_adjust',
      description: description || (amount > 0 ? '管理者による付与' : '管理者による減算'),
      price_yen: null,
    }),
  ])

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, newPoints })
}
