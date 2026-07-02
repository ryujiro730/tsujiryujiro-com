import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/supabase/get-auth-user'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const authClient = createClient()
  const user = await getAuthUser(authClient)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { category: string; content: string; rating?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { category, content, rating } = body
  if (!category || !content?.trim()) {
    return NextResponse.json({ error: 'category と content は必須です' }, { status: 400 })
  }
  if (content.trim().length > 2000) {
    return NextResponse.json({ error: '2000文字以内で入力してください' }, { status: 400 })
  }

  const categoryLabels: Record<string, string> = {
    bug: '🐛 バグ報告',
    feature: '✨ 機能要望',
    ui: '🎨 UIについて',
    ai: '🤖 AI返信について',
    other: '💬 その他',
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'noreply@aikano.chat',
    to: 'info@aikano.chat',
    subject: `[アイカノ フィードバック] ${categoryLabels[category] ?? category}${rating ? ` ★${rating}` : ''}`,
    text: [
      `ユーザーID: ${user.id}`,
      `カテゴリ: ${categoryLabels[category] ?? category}`,
      rating ? `評価: ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${rating}/5)` : '',
      '',
      '--- フィードバック内容 ---',
      content.trim(),
    ].filter(Boolean).join('\n'),
  }).catch(err => console.error('[feedback] メール送信エラー:', err))

  return NextResponse.json({ ok: true })
}
