export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'staff'].includes(profile.role)) return null
  return user
}

// PUT /api/admin/videos/[id] - 動画更新
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, description, price_points, video_url, thumbnail_url, character_id, is_active, sort_order } = body

  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const updatePayload: Record<string, unknown> = {}
  if (title !== undefined) updatePayload.title = title?.trim()
  if (description !== undefined) updatePayload.description = description?.trim() || null
  if (price_points !== undefined) updatePayload.price_points = price_points
  if (video_url !== undefined) updatePayload.video_url = video_url?.trim()
  if (thumbnail_url !== undefined) updatePayload.thumbnail_url = thumbnail_url || null
  if (character_id !== undefined) updatePayload.character_id = character_id || null
  if (is_active !== undefined) updatePayload.is_active = is_active
  if (sort_order !== undefined) updatePayload.sort_order = sort_order

  const { data: video, error } = await adminDb
    .from('video_items')
    .update(updatePayload)
    .eq('id', params.id)
    .select('*, character:characters(name, avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ video })
}

// DELETE /api/admin/videos/[id] - 動画削除
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await adminDb
    .from('video_items')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
