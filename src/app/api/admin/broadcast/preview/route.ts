import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminSupabase = SupabaseClient<any, any, any>

interface UserFilterParams {
  registeredFrom?: string | null
  registeredTo?: string | null
  chargedMin?: number | null
  chargedMax?: number | null
  gender?: string | null
  ageMin?: number | null
  ageMax?: number | null
}

function buildUserQuery(adminClient: AdminSupabase, params: UserFilterParams) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = adminClient
    .from('admin_users_view')
    .select('id, display_name')

  if (params.registeredFrom) {
    query = query.gte('created_at', params.registeredFrom)
  }
  if (params.registeredTo) {
    // registeredTo は日付の終わりまで含むため翌日未満で絞る
    const to = new Date(params.registeredTo)
    to.setDate(to.getDate() + 1)
    query = query.lt('created_at', to.toISOString().split('T')[0])
  }
  if (params.chargedMin != null) {
    query = query.gte('total_charged', params.chargedMin)
  }
  if (params.chargedMax != null) {
    query = query.lte('total_charged', params.chargedMax)
  }
  if (params.gender) {
    query = query.eq('gender', params.gender)
  }
  if (params.ageMin != null) {
    query = query.gte('age', params.ageMin)
  }
  if (params.ageMax != null) {
    query = query.lte('age', params.ageMax)
  }

  return query
}

export async function GET(req: NextRequest) {
  // 認証チェック
  const authClient = createServerClient()
  const { data: { user }, error: authError } = await authClient.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data: profile } = await authClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || !['admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const characterId = searchParams.get('characterId')
  const excludeWithConv = searchParams.get('excludeWithConv') !== 'false'
  const registeredFrom = searchParams.get('registeredFrom') || null
  const registeredTo = searchParams.get('registeredTo') || null
  const chargedMinStr = searchParams.get('chargedMin')
  const chargedMaxStr = searchParams.get('chargedMax')
  const gender = searchParams.get('gender') || null
  const ageMinStr = searchParams.get('ageMin')
  const ageMaxStr = searchParams.get('ageMax')

  if (!characterId) {
    return NextResponse.json({ error: 'characterId is required' }, { status: 400 })
  }

  const chargedMin = chargedMinStr ? parseInt(chargedMinStr) : null
  const chargedMax = chargedMaxStr ? parseInt(chargedMaxStr) : null
  const ageMin = ageMinStr ? parseInt(ageMinStr) : null
  const ageMax = ageMaxStr ? parseInt(ageMaxStr) : null

  // サービスロールクライアント（RLSバイパス）
  const adminClient: AdminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ユーザーリスト取得
  const { data: users, error: usersError } = await buildUserQuery(adminClient, {
    registeredFrom,
    registeredTo,
    chargedMin,
    chargedMax,
    gender,
    ageMin,
    ageMax,
  })

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

  let targetUsers: Array<{ id: string; display_name: string | null }> = users ?? []

  // excludeWithConv: そのキャラとすでに conversation があるユーザーを除外
  if (excludeWithConv && targetUsers.length > 0) {
    const userIds = targetUsers.map((u) => u.id)
    const { data: existingConvs } = await adminClient
      .from('conversations')
      .select('user_id')
      .eq('character_id', characterId)
      .in('user_id', userIds)

    const existingUserIds = new Set<string>((existingConvs ?? []).map((c: { user_id: string }) => c.user_id))
    targetUsers = targetUsers.filter((u) => !existingUserIds.has(u.id))
  }

  const samples = targetUsers
    .slice(0, 5)
    .map((u) => u.display_name ?? '(名前未設定)')

  return NextResponse.json({ count: targetUsers.length, samples })
}
