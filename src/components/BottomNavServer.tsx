import { createClient } from '@supabase/supabase-js'
import { BottomNav } from './BottomNav'

async function getUnreadCount(userId: string): Promise<number> {
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: convs } = await admin.from('conversations').select('id').eq('user_id', userId)
    const ids = (convs ?? []).map((c: { id: string }) => c.id)
    if (!ids.length) return 0
    const { count } = await admin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', ids)
      .eq('sender_role', 'character')
      .eq('is_read', false)
    return count ?? 0
  } catch {
    return 0
  }
}

export async function BottomNavServer({ userId }: { userId: string }) {
  const unreadCount = await getUnreadCount(userId)
  return <BottomNav unreadCount={unreadCount} />
}
