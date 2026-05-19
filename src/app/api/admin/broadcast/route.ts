export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/supabase/get-auth-user'
import { processBroadcast, createAdminSupabase, type BroadcastFilters } from '@/lib/broadcast'

export async function POST(req: NextRequest) {
  const authClient = createServerClient()
  const user = await getAuthUser(authClient)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await authClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'staff'].includes(profile.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { characterId: string; message: string; scheduledAt?: string | null; filters: BroadcastFilters }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { characterId, message, scheduledAt, filters } = body
  if (!characterId || !message?.trim())
    return NextResponse.json({ error: 'characterId and message are required' }, { status: 400 })

  const adminClient = createAdminSupabase()
  const { data: job, error: insertError } = await adminClient
    .from('broadcast_jobs')
    .insert({
      character_id: characterId,
      message: message.trim(),
      scheduled_at: scheduledAt || null,
      exclude_with_conversation: filters.excludeWithConv ?? true,
      filter_registered_from: filters.registeredFrom || null,
      filter_registered_to:   filters.registeredTo || null,
      filter_charged_min:     filters.chargedMin ?? null,
      filter_charged_max:     filters.chargedMax ?? null,
      filter_gender:          filters.gender || null,
      filter_age_min:         filters.ageMin ?? null,
      filter_age_max:         filters.ageMax ?? null,
      status: 'pending',
      created_by: user.id,
    })
    .select('id').single()

  if (insertError || !job)
    return NextResponse.json({ error: insertError?.message ?? 'Failed to create job' }, { status: 500 })

  const shouldProcessNow = !scheduledAt || new Date(scheduledAt) <= new Date()
  if (shouldProcessNow) {
    processBroadcast(job.id).catch(err => console.error('broadcast bg error:', err))
    return NextResponse.json({ jobId: job.id, status: 'processing' })
  }

  return NextResponse.json({ jobId: job.id, status: 'pending' })
}
