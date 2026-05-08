import { createClient as createAdminClient } from '@supabase/supabase-js'
import { unstable_noStore as noStore } from 'next/cache'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

function admin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  open:     { label: '未回答', color: '#e87980' },
  answered: { label: '回答済み', color: '#7ec850' },
  closed:   { label: 'クローズ', color: '#aaa' },
}

export default async function AdminInquiriesPage() {
  noStore()

  const { data: inquiries } = await admin()
    .from('inquiries')
    .select(`
      id, subject, status, created_at,
      profiles!user_id(display_name, email),
      inquiry_replies(id)
    `)
    .order('created_at', { ascending: false })

  const open = inquiries?.filter(i => i.status === 'open').length ?? 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">お問い合わせ管理</h1>
          {open > 0 && (
            <p className="text-sm mt-1" style={{ color: '#e87980' }}>未回答 {open}件</p>
          )}
        </div>
      </div>

      {!inquiries || inquiries.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-[var(--color-text-muted)] text-sm">お問い合わせはありません</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['日時', 'ユーザー', '件名', '返信', 'ステータス', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inq, i) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const profile = inq.profiles as any
                const replyCount = (inq.inquiry_replies as { id: string }[]).length
                return (
                  <tr key={inq.id} style={{ borderBottom: i < inquiries.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {format(new Date(inq.created_at), 'MM/dd HH:mm', { locale: ja })}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '13px', maxWidth: '140px' }}>
                      <p className="truncate font-medium">{profile?.display_name ?? '—'}</p>
                      <p className="truncate text-[11px] text-[var(--color-text-muted)]">{profile?.email ?? ''}</p>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '13px', maxWidth: '200px' }}>
                      <p className="truncate">{inq.subject}</p>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '13px', textAlign: 'center' }}>
                      {replyCount > 0 ? replyCount : '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px',
                        background: `${STATUS_LABEL[inq.status]?.color}22`,
                        color: STATUS_LABEL[inq.status]?.color,
                      }}>
                        {STATUS_LABEL[inq.status]?.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <Link href={`/admin/inquiries/${inq.id}`}
                        className="text-xs px-3 py-1.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors"
                        style={{ color: 'var(--color-primary)' }}>
                        詳細 →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
