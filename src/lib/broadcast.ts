import { createClient, SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminSupabase = SupabaseClient<any, any, any>

export interface BroadcastFilters {
  excludeWithConv: boolean
  registeredFrom?: string | null
  registeredTo?: string | null
  chargedMin?: number | null
  chargedMax?: number | null
  gender?: string | null
  ageMin?: number | null
  ageMax?: number | null
}

function buildUserQuery(adminClient: AdminSupabase, filters: BroadcastFilters) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = adminClient.from('admin_users_view').select('id, display_name')
  if (filters.registeredFrom) query = query.gte('created_at', filters.registeredFrom)
  if (filters.registeredTo) {
    const to = new Date(filters.registeredTo)
    to.setDate(to.getDate() + 1)
    query = query.lt('created_at', to.toISOString().split('T')[0])
  }
  if (filters.chargedMin != null) query = query.gte('total_charged', filters.chargedMin)
  if (filters.chargedMax != null) query = query.lte('total_charged', filters.chargedMax)
  if (filters.gender)             query = query.eq('gender', filters.gender)
  if (filters.ageMin != null)     query = query.gte('age', filters.ageMin)
  if (filters.ageMax != null)     query = query.lte('age', filters.ageMax)
  return query
}

export async function getTargetUserIds(
  adminClient: AdminSupabase,
  characterId: string,
  filters: BroadcastFilters
): Promise<string[]> {
  const { data: users, error } = await buildUserQuery(adminClient, filters)
  if (error || !users) return []

  let targetUsers: Array<{ id: string }> = users

  if (filters.excludeWithConv && targetUsers.length > 0) {
    const userIds = targetUsers.map(u => u.id)
    const { data: existingConvs } = await adminClient
      .from('conversations').select('user_id')
      .eq('character_id', characterId).in('user_id', userIds)
    const existingSet = new Set<string>((existingConvs ?? []).map((c: { user_id: string }) => c.user_id))
    targetUsers = targetUsers.filter(u => !existingSet.has(u.id))
  }

  return targetUsers.map(u => u.id)
}

export function createAdminSupabase(): AdminSupabase {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function processBroadcast(jobId: string): Promise<void> {
  const adminClient = createAdminSupabase()

  const { data: job, error: jobError } = await adminClient
    .from('broadcast_jobs').select('*').eq('id', jobId).single()

  if (jobError || !job) {
    console.error('processBroadcast: job not found', jobError)
    return
  }

  const filters: BroadcastFilters = {
    excludeWithConv: job.exclude_with_conversation,
    registeredFrom:  job.filter_registered_from,
    registeredTo:    job.filter_registered_to,
    chargedMin:      job.filter_charged_min,
    chargedMax:      job.filter_charged_max,
    gender:          job.filter_gender,
    ageMin:          job.filter_age_min,
    ageMax:          job.filter_age_max,
  }

  try {
    const targetUserIds = await getTargetUserIds(adminClient, job.character_id, filters)

    await adminClient.from('broadcast_jobs')
      .update({ target_count: targetUserIds.length, status: 'processing' }).eq('id', jobId)

    let sentCount = 0
    const now = new Date().toISOString()

    for (const userId of targetUserIds) {
      try {
        const { data: existingConv } = await adminClient
          .from('conversations').select('id')
          .eq('user_id', userId).eq('character_id', job.character_id).single()

        let conversationId: string

        if (existingConv) {
          conversationId = existingConv.id
        } else {
          const { data: newConv, error: convError } = await adminClient
            .from('conversations')
            .insert({ user_id: userId, character_id: job.character_id, last_message_at: now, is_unread_staff: false })
            .select('id').single()
          if (convError || !newConv) { console.error('processBroadcast: conv create failed', convError); continue }
          conversationId = newConv.id
        }

        const { error: msgError } = await adminClient.from('messages').insert({
          conversation_id: conversationId,
          sender_role: 'character',
          content: job.message,
          points_used: 0,
          is_read: false,
        })
        if (msgError) { console.error('processBroadcast: msg insert failed', msgError); continue }

        await adminClient.from('conversations')
          .update({ last_message_at: now, is_unread_staff: false }).eq('id', conversationId)

        sentCount++
      } catch (err) {
        console.error('processBroadcast: error for user', userId, err)
      }
    }

    await adminClient.from('broadcast_jobs')
      .update({ status: 'done', sent_count: sentCount }).eq('id', jobId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await adminClient.from('broadcast_jobs')
      .update({ status: 'failed', error_message: msg }).eq('id', jobId)
    console.error('processBroadcast: fatal error', err)
  }
}
