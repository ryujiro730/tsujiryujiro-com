export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/supabase/get-auth-user'
import { getTargetUserIds, createAdminSupabase } from '@/lib/broadcast'

export async function GET(req: NextRequest) {
  const authClient = createServerClient()
  const user = await getAuthUser(authClient)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await authClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'staff'].includes(profile.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = req.nextUrl
  const characterId = searchParams.get('characterId')
  if (!characterId) return NextResponse.json({ error: 'characterId is required' }, { status: 400 })

  const chargedMinStr = searchParams.get('chargedMin')
  const chargedMaxStr = searchParams.get('chargedMax')
  const ageMinStr = searchParams.get('ageMin')
  const ageMaxStr = searchParams.get('ageMax')

  const adminClient = createAdminSupabase()

  const targetUserIds = await getTargetUserIds(adminClient, characterId, {
    excludeWithConv: searchParams.get('excludeWithConv') !== 'false',
    registeredFrom:  searchParams.get('registeredFrom') || null,
    registeredTo:    searchParams.get('registeredTo') || null,
    chargedMin:      chargedMinStr ? parseInt(chargedMinStr) : null,
    chargedMax:      chargedMaxStr ? parseInt(chargedMaxStr) : null,
    gender:          searchParams.get('gender') || null,
    ageMin:          ageMinStr ? parseInt(ageMinStr) : null,
    ageMax:          ageMaxStr ? parseInt(ageMaxStr) : null,
  })

  // サンプル名を取得
  const { data: sampleUsers } = await adminClient
    .from('admin_users_view').select('display_name')
    .in('id', targetUserIds.slice(0, 5))

  const samples = (sampleUsers ?? []).map((u: { display_name: string | null }) => u.display_name ?? '(名前未設定)')

  return NextResponse.json({ count: targetUserIds.length, samples })
}
