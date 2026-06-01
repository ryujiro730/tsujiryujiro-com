export const dynamic = 'force-dynamic'
/**
 * AI学習データエクスポートAPI
 * GET /api/admin/training-export
 *
 * training_dataテーブルの全データをJSONL形式でダウンロードする。
 * 各行 = 1会話 = LLMファインチューニング用の messages 配列
 *
 * 出力フォーマット（1行1JSON）:
 * {"messages":[{"role":"system","content":"..."},{"role":"user","content":"..."},{"role":"assistant","content":"..."},...]}
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(req: NextRequest) {
  // getSession()はcookie読み取りのみ（ネットワーク不要）→ 確実に動作
  const authClient = createServerClient()
  const { data: { session } } = await authClient.auth.getSession()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = adminSupabase()

  // roleチェックはservice roleで（RLSなし→高速・確実）
  const { data: profile } = await admin
    .from('profiles').select('role').eq('id', userId).single()

  if (!profile || !['admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // クエリパラメーター
  const url = new URL(req.url)
  const characterId = url.searchParams.get('character_id') // 特定キャラクターのみ
  const minMessages = parseInt(url.searchParams.get('min_messages') ?? '2', 10)

  let query = admin
    .from('training_data')
    .select('system_prompt, messages, message_count, character_id, updated_at')
    .gte('message_count', minMessages)
    .order('updated_at', { ascending: false })

  if (characterId) {
    query = query.eq('character_id', characterId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // JSONL形式に変換
  // 各行: {"messages": [{"role":"system","content":"..."}, ...会話履歴...]}
  const lines = (data ?? []).map((row) => {
    const msgs: Array<{ role: string; content: string }> = []

    if (row.system_prompt) {
      msgs.push({ role: 'system', content: row.system_prompt })
    }

    const history = Array.isArray(row.messages) ? row.messages : []
    msgs.push(...history)

    return JSON.stringify({ messages: msgs })
  })

  const jsonl = lines.join('\n')

  const filename = characterId
    ? `training_data_char_${characterId}_${new Date().toISOString().slice(0, 10)}.jsonl`
    : `training_data_all_${new Date().toISOString().slice(0, 10)}.jsonl`

  return new NextResponse(jsonl, {
    headers: {
      'Content-Type': 'application/jsonl',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
