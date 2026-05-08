import { createClient as createAdminClient } from '@supabase/supabase-js'
import { unstable_noStore as noStore } from 'next/cache'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import InquiryReplyForm from './InquiryReplyForm'

function admin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export default async function AdminInquiryDetailPage({ params }: { params: { id: string } }) {
  noStore()

  const [{ data: inquiry }, { data: replies }] = await Promise.all([
    admin()
      .from('inquiries')
      .select('id, subject, message, status, created_at, profiles!user_id(display_name, email)')
      .eq('id', params.id)
      .single(),
    admin()
      .from('inquiry_replies')
      .select('id, sender_role, message, created_at, profiles!staff_id(display_name)')
      .eq('inquiry_id', params.id)
      .order('created_at', { ascending: true }),
  ])

  if (!inquiry) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = inquiry.profiles as any

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin/inquiries" className="p-1 -ml-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold">お問い合わせ詳細</h1>
      </div>

      {/* 送信者情報 */}
      <div className="card p-4 mb-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ background: 'var(--color-primary)' }}>
          {(profile?.display_name ?? '?')[0]}
        </div>
        <div>
          <p className="text-sm font-semibold">{profile?.display_name ?? '不明'}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{profile?.email ?? ''}</p>
        </div>
        <div className="ml-auto text-xs text-[var(--color-text-muted)]">
          {format(new Date(inquiry.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
        </div>
      </div>

      {/* 元のメッセージ */}
      <div className="card p-5 mb-4">
        <h2 className="font-semibold mb-3">{inquiry.subject}</h2>
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-[var(--color-text-muted)]">
          {inquiry.message}
        </p>
      </div>

      {/* スレッド */}
      {(replies ?? []).length > 0 && (
        <div className="flex flex-col gap-3 mb-4">
          {(replies ?? []).map(reply => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const staffProfile = reply.profiles as any
            return (
              <div key={reply.id} className="card p-4"
                style={reply.sender_role === 'staff' ? { borderLeft: '3px solid var(--color-primary)' } : {}}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold" style={{ color: reply.sender_role === 'staff' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                    {reply.sender_role === 'staff' ? `スタッフ（${staffProfile?.display_name ?? ''}）` : 'ユーザー'}
                  </span>
                  <span className="text-[11px] text-[var(--color-text-muted)]">
                    {format(new Date(reply.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                  </span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{reply.message}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* 返信フォーム */}
      <InquiryReplyForm inquiryId={params.id} status={inquiry.status} />
    </div>
  )
}
