import { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: '特定商取引法に基づく表記 | AiKano',
  description: 'AiKano 特定商取引法に基づく表記',
}

const rows: { label: string; value: string }[] = [
  { label: '販売事業者', value: '合同会社TJYM（TJYM LLC）' },
  { label: '代表者', value: '有限責任社員 辻龍次朗 / 有限責任社員 山内政志' },
  { label: '所在地', value: '〒530-0001 大阪府大阪市北区梅田一丁目２番２号 大阪駅前第２ビル１２－１２' },
  { label: '連絡先メール', value: 'info@tjym.org' },
  { label: 'ウェブサイト', value: 'https://tjym.org' },
  { label: 'サービスURL', value: 'https://aikano.chat' },
  { label: '販売価格', value: '1ポイント＝10円（税込）。ポイントはまとめ買いによりボーナスが付与されます。詳細はポイント購入ページをご確認ください。' },
  { label: '支払い方法', value: 'クレジットカード決済（Visa / Mastercard / American Express / JCB 等）' },
  { label: '支払い時期', value: '購入手続き完了時' },
  { label: 'サービス提供時期', value: 'ポイント購入完了後、即時利用可能' },
  { label: '返品・キャンセル', value: 'デジタルコンテンツの性質上、ポイント購入後の返金・キャンセルには応じられません。未成年者契約の取消しについては消費者契約法および民法の規定に従います。' },
  { label: '動作環境', value: '最新バージョンのChrome / Safari / Firefox / Edge を推奨。インターネット接続が必要です。' },
  { label: '事業内容', value: 'AIソリューション開発 / 国産AIコンパニオンサービス「AiKano」運営 / Webサービス・システム受託開発 / デジタルマーケティング / バーチャルキャラクター制作 / デジタルコンテンツ制作' },
]

export default function TokushoPage() {
  return (
    <div className="min-h-screen" style={{ background: '#fff' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8' }} className="sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link href="/" style={{ fontSize: '13px', color: '#888', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
            className="hover:text-[#1a1a1a] transition-colors">
            <ChevronLeft size={14} />AiKano
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-14">
        <h1 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: '1.75rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '8px' }}>
          特定商取引法に基づく表記
        </h1>
        <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '48px' }}>最終更新日：2026年7月1日</p>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e8e8e8' }}>
                <th style={{
                  width: '160px',
                  minWidth: '120px',
                  padding: '16px 20px 16px 0',
                  textAlign: 'left',
                  verticalAlign: 'top',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1a1a1a',
                  whiteSpace: 'nowrap',
                }}>
                  {row.label}
                </th>
                <td style={{
                  padding: '16px 0',
                  fontSize: '14px',
                  color: '#444',
                  lineHeight: 1.8,
                  verticalAlign: 'top',
                }}>
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '64px', paddingTop: '24px', borderTop: '1px solid #e8e8e8' }}>
          <p style={{ fontSize: '13px', color: '#aaa', textAlign: 'center' }}>
            合同会社TJYM（AiKano 運営事務局）
          </p>
        </div>
      </div>
    </div>
  )
}
