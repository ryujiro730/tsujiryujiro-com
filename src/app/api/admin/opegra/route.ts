export const dynamic = 'force-dynamic'
/**
 * オペグラ写真管理API（管理者）
 * GET    /api/admin/opegra            - 写真一覧 / ?hashes= で重複チェック
 * POST   /api/admin/opegra            - 写真レコード作成
 * PATCH  /api/admin/opegra            - 複数写真のカテゴリ・キャラ一括変更
 * DELETE /api/admin/opegra            - 複数写真を一括削除
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

export async function GET(req: NextRequest) {
  const user = await assertAdminOrStaff()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = adminSupabase()

  // ?hashes=h1,h2,... → 重複チェックモード
  const hashParam = req.nextUrl.searchParams.get('hashes')
  if (hashParam) {
    const hashes = hashParam.split(',').filter(Boolean)
    const { data, error: hashErr } = await admin
      .from('opegra_photos')
      .select('*, characters(id, name)')
      .in('file_hash', hashes)
    if (hashErr) return NextResponse.json({ error: hashErr.message }, { status: 500 })
    const map: Record<string, unknown> = {}
    for (const photo of data ?? []) {
      if (photo.file_hash) map[photo.file_hash] = photo
    }
    return NextResponse.json({ matches: map })
  }

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
  const { characterId, title, imageUrl, sortOrder, mediaType, category, fileHash } = body
  if (!imageUrl) return NextResponse.json({ error: 'imageUrl required' }, { status: 400 })

  const VALID_CATEGORIES = ['food', 'scenery', 'hobby', 'other']

  const admin = adminSupabase()
  const { data, error } = await admin
    .from('opegra_photos')
    .insert({
      character_id: characterId ?? null,
      title: title ?? '',
      image_url: imageUrl,
      sort_order: sortOrder ?? 0,
      media_type: mediaType === 'video' ? 'video' : 'image',
      category: VALID_CATEGORIES.includes(category) ? category : null,
      file_hash: fileHash ?? null,
    })
    .select('*, characters(id, name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ photo: data })
}

export async function PATCH(req: NextRequest) {
  const user = await assertAdminOrStaff()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { photoIds, characterId, category } = body
  if (!Array.isArray(photoIds) || photoIds.length === 0) {
    return NextResponse.json({ error: 'photoIds required' }, { status: 400 })
  }

  const VALID_CATEGORIES = ['food', 'scenery', 'hobby', 'other']
  const admin = adminSupabase()

  const updatePayload: Record<string, unknown> = {
    character_id: characterId ?? null,
    category: VALID_CATEGORIES.includes(category) ? category : null,
  }

  const { error } = await admin
    .from('opegra_photos')
    .update(updatePayload)
    .in('id', photoIds)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ updated: photoIds.length })
}

export async function DELETE(req: NextRequest) {
  const user = await assertAdminOrStaff()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { photoIds } = body
  if (!Array.isArray(photoIds) || photoIds.length === 0) {
    return NextResponse.json({ error: 'photoIds required' }, { status: 400 })
  }

  const admin = adminSupabase()
  const { error } = await admin.from('opegra_photos').delete().in('id', photoIds)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: photoIds.length })
}
