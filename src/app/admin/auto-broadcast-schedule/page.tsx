import { createAdminClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'
import AutoBroadcastCalendar from '@/components/admin/AutoBroadcastCalendar'

export default async function AutoBroadcastSchedulePage() {
  noStore()
  const supabase = createAdminClient()

  const [{ data: sequences }, { data: characters }] = await Promise.all([
    supabase
      .from('auto_broadcast_sequences')
      .select(`
        id, name, is_active, character_id,
        characters ( name, avatar_url ),
        auto_broadcast_steps ( id, step_number, delay_minutes, message, image_url )
      `)
      .order('created_at', { ascending: true }),
    supabase
      .from('characters')
      .select('id, name, avatar_url')
      .eq('is_active', true)
      .order('name'),
  ])

  const normalized = (sequences ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    is_active: s.is_active,
    character_id: s.character_id,
    character_name: s.characters?.name ?? '不明',
    character_avatar: s.characters?.avatar_url ?? null,
    steps: (s.auto_broadcast_steps ?? []).sort((a: any, b: any) => a.step_number - b.step_number),
  }))

  const normalizedChars = (characters ?? []).map((c: any) => ({
    id: c.id, name: c.name, avatar_url: c.avatar_url,
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold mb-1">自動同報スケジュール</h1>
        <p className="text-[var(--color-text-muted)] text-sm">
          シーケンスをクリックして詳細確認・編集できます。
        </p>
      </div>
      <AutoBroadcastCalendar sequences={normalized} characters={normalizedChars} />
    </div>
  )
}
