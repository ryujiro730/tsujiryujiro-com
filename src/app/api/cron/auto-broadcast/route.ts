import { NextRequest, NextResponse } from 'next/server'
import { processAutoBroadcast } from '@/lib/auto-broadcast'

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (token !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const result = await processAutoBroadcast()
  return NextResponse.json(result)
}
