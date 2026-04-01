'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RealtimeRefresher() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // リアルタイム（来たらすぐ更新）
    const channel = supabase
      .channel('admin-inbox-refresh')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
      }, () => { router.refresh() })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'conversations',
      }, () => { router.refresh() })
      .subscribe()

    // ポーリング（リアルタイムが来なくても10秒ごとに必ず更新）
    const interval = setInterval(() => { router.refresh() }, 15000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [router])

  return null
}
