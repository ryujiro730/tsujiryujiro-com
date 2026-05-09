import { NextRequest, NextResponse } from 'next/server'
import { processBroadcast, createAdminSupabase } from '@/lib/broadcast'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // CRON_SECRET による認証
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (token !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const adminClient = createAdminSupabase()

  // pending かつ scheduled_at <= now() のジョブを取得
  const now = new Date().toISOString()
  const { data: jobs, error } = await adminClient
    .from('broadcast_jobs')
    .select('id')
    .eq('status', 'pending')
    .lte('scheduled_at', now)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  // 各ジョブを処理（並列実行）
  const results = await Promise.allSettled(
    jobs.map((job: { id: string }) => processBroadcast(job.id))
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  return NextResponse.json({ processed: jobs.length, succeeded, failed })
}
