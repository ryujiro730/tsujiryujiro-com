export const dynamic = 'force-dynamic'
/**
 * オペグラ写真管理API（管理者）
 * GET  /api/admin/opegra  - 写真一覧（キャラ情報付き）
 * POST /api/admin/opegra  - 写真レコード作成（画像URLは事前にStorage済み）
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/supabase/get-auth-user'

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function assertAdminOrStaff() {
  const authClient = createServerClient()
  const user = await getAuthUser(authClient)
  if (!user) return null
  const { data } = await authClient.from('profiles').select('role').eq('id', user.id).single()
  if (!data || !['admin', 'staff'].includes(data.role)) return null
  return user
}

export async function GET() {
  const user = await assertAdminOrStaff()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = adminSupabase()
  const { data, error } = await admin
    .from('opegra_photos')
    .select('*, characters(id, name)')
    .order('sort_order')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ photos: data })
}

export async function POST(req: NextRequest) {
  const user = await assertAdminOrStaff()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { characterId, title, imageUrl, sortOrder } = body
  if (!imageUrl) return NextResponse.json({ error: 'imageUrl required' }, { status: 400 })

  const admin = adminSupabase()
  const { data, error } = await admin
    .from('opegra_photos')
    .insert({
      character_id: characterId ?? null,
      title: title ?? '',
      image_url: imageUrl,
      sort_order: sortOrder ?? 0,
    })
    .select('*, characters(id, name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ photo: data })
}
