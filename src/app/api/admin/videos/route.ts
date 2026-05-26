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

// GET /api/admin/videos - 全動画一覧（非公開含む）
export async function GET() {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: videos, error } = await adminDb
    .from('video_items')
    .select('*, character:characters(name, avatar_url)')
    .order('sort_order')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ videos: videos ?? [] })
}

// POST /api/admin/videos - 動画追加
export async function POST(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, description, price_points, video_url, thumbnail_url, character_id, is_active, sort_order } = body

  if (!title?.trim() || !video_url?.trim()) {
    return NextResponse.json({ error: 'title and video_url are required' }, { status: 400 })
  }

  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: video, error } = await adminDb
    .from('video_items')
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      price_points: price_points ?? 100,
      video_url: video_url.trim(),
      thumbnail_url: thumbnail_url || null,
      character_id: character_id || null,
      is_active: is_active ?? true,
      sort_order: sort_order ?? 0,
    })
    .select('*, character:characters(name, avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ video })
}
