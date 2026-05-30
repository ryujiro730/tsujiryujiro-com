import { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'プライバシーポリシー | AiKano',
  description: 'AiKano プライバシーポリシー',
}

export default function PrivacyPage() {
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
          プライバシーポリシー
        </h1>
        <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '48px' }}>最終更新日：2026年6月</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

          <section>
            <h2 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e8e8e8' }}>
              第1条　基本方針
            </h2>
            <ol style={{ paddingLeft: '1.4em', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li style={{ fontSize: '14px', color: '#444', lineHeight: 1.8 }}>
                AiKano運営事務局（以下「当社」）は、ユーザーの個人情報の保護を重要な責務と認識し、個人情報の保護に関する法律（個人情報保護法）その他関連法令を遵守します。
              </li>
            </ol>
          </section>

          <section>
            <h2 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e8e8e8' }}>
              第2条　取得する情報
            </h2>
            <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.8, marginBottom: '16px' }}>
              当社は、本サービスの提供にあたり、以下の情報を取得します。
            </p>
            <p style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: 700, marginBottom: '8px' }}>ユーザーが直接入力する情報</p>
            <ul style={{ paddingLeft: '1.4em', margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: '6px', listStyleType: 'disc' }}>
              {[
                'メールアドレス（登録時）',
                'パスワード（登録時・ハッシュ化して保存）',
                'ユーザーが会話中に自発的に入力した情報（氏名・住所・電話番号等をユーザーが入力した場合）',
              ].map((item, i) => (
                <li key={i} style={{ fontSize: '14px', color: '#444', lineHeight: 1.8 }}>{item}</li>
              ))}
            </ul>
            <p style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: 700, marginBottom: '8px' }}>サービス利用に伴い自動取得する情報</p>
            <ul style={{ paddingLeft: '1.4em', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px', listStyleType: 'disc' }}>
              {[
                'IPアドレス・アクセスログ',
                'デバイス情報・ブラウザ情報',
                '本サービス上での行動履歴（ログイン日時・課金履歴・利用キャラクター等）',
                'ユーザーとAIキャラクター間のチャット内容',
              ].map((item, i) => (
                <li key={i} style={{ fontSize: '14px', color: '#444', lineHeight: 1.8 }}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e8e8e8' }}>
              第3条　情報の利用目的
            </h2>
            <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.8, marginBottom: '12px' }}>
              取得した情報は、以下の目的に限り利用します。
            </p>
            <ol style={{ paddingLeft: '1.4em', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                '本サービスの提供・運営・改善',
                'ユーザー認証およびアカウント管理',
                '課金・ポイント管理',
                'AI応答品質の向上および当社AIモデルの学習・改善',
                '不正利用・規約違反の検知および対応',
                '法令に基づく対応（捜査機関からの照会等）',
                'お問い合わせへの対応',
              ].map((item, i) => (
                <li key={i} style={{ fontSize: '14px', color: '#444', lineHeight: 1.8 }}>{item}</li>
              ))}
            </ol>
          </section>

          <section>
            <h2 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e8e8e8' }}>
              第4条　チャット内容の取り扱い（重要）
            </h2>
            <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.8, marginBottom: '12px' }}>
              本サービスの性質上、チャット内容の取り扱いについて以下のとおり定めます。
            </p>
            <ol style={{ paddingLeft: '1.4em', margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li style={{ fontSize: '14px', color: '#444', lineHeight: 1.8 }}>
                <strong style={{ color: '#1a1a1a' }}>スタッフによる確認：</strong>
                ユーザーとキャラクター間のチャット内容は、応答品質の維持・向上、不正利用の検知、およびAIモデルの学習改善を目的として、当社スタッフが確認する場合があります。
              </li>
              <li style={{ fontSize: '14px', color: '#444', lineHeight: 1.8 }}>
                <strong style={{ color: '#1a1a1a' }}>AI学習への利用：</strong>
                個人を特定できない形に加工した上で、当社AIモデルの学習データとして利用する場合があります。
              </li>
              <li style={{ fontSize: '14px', color: '#444', lineHeight: 1.8 }}>
                <strong style={{ color: '#1a1a1a' }}>外部提供の禁止：</strong>
                チャット内容を、法令に基づく場合を除き、第三者（広告主・他企業等）に提供・販売することはありません。
              </li>
              <li style={{ fontSize: '14px', color: '#444', lineHeight: 1.8 }}>
                <strong style={{ color: '#1a1a1a' }}>法令対応：</strong>
                児童ポルノ要求・犯罪助長等の違法行為が検出された場合、当該チャットログを証拠として保全し、必要に応じて捜査機関に提供することがあります。
              </li>
            </ol>
            <p style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: 600, lineHeight: 1.8, padding: '12px 16px', background: '#f8f8f8', borderRadius: '6px', borderLeft: '3px solid #e8e8e8' }}>
              ユーザーは、本サービスに登録することにより、上記のチャット内容の取り扱いに同意するものとします。
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e8e8e8' }}>
              第5条　第三者提供
            </h2>
            <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.8, marginBottom: '12px' }}>
              当社は、以下の場合を除き、取得した個人情報を第三者に提供しません。
            </p>
            <ol style={{ paddingLeft: '1.4em', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                'ユーザーの事前同意がある場合',
                '法令に基づく場合（裁判所・捜査機関からの照会等）',
                '人の生命・身体・財産の保護のために必要な場合',
                '本サービスの運営に必要な業務委託先への提供（守秘義務契約締結済みの場合に限る）',
              ].map((item, i) => (
                <li key={i} style={{ fontSize: '14px', color: '#444', lineHeight: 1.8 }}>{item}</li>
              ))}
            </ol>
          </section>

          <section>
            <h2 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e8e8e8' }}>
              第6条　外部サービスの利用
            </h2>
            <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.8, marginBottom: '12px' }}>
              本サービスは、以下の外部サービスを利用しており、それぞれのプライバシーポリシーが適用される場合があります。
            </p>
            <ul style={{ paddingLeft: '1.4em', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', listStyleType: 'disc' }}>
              <li style={{ fontSize: '14px', color: '#444', lineHeight: 1.8 }}>
                <strong style={{ color: '#1a1a1a' }}>決済サービス：</strong>
                ポイント購入時の決済処理（クレジットカード情報は当社サーバーに保存しません）
              </li>
              <li style={{ fontSize: '14px', color: '#444', lineHeight: 1.8 }}>
                <strong style={{ color: '#1a1a1a' }}>解析ツール：</strong>
                サービス改善のためのアクセス解析（Google Analytics等）
              </li>
              <li style={{ fontSize: '14px', color: '#444', lineHeight: 1.8 }}>
                <strong style={{ color: '#1a1a1a' }}>AI基盤モデル：</strong>
                応答生成に外部AI API（OpenAI・Anthropic等）を利用する場合があります。その際、会話内容が当該サービスのAPIに送信される場合があります。
              </li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e8e8e8' }}>
              第7条　Cookieの利用
            </h2>
            <ol style={{ paddingLeft: '1.4em', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li style={{ fontSize: '14px', color: '#444', lineHeight: 1.8 }}>
                本サービスでは、ログイン状態の維持・サービス改善のためCookieを利用します。ブラウザの設定によりCookieを無効にすることができますが、一部機能が利用できなくなる場合があります。
              </li>
            </ol>
          </section>

          <section>
            <h2 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e8e8e8' }}>
              第8条　個人情報の保管・管理
            </h2>
            <ol style={{ paddingLeft: '1.4em', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                '当社は、個人情報の漏洩・滅失・毀損を防止するため、適切なセキュリティ措置を講じます。',
                '個人情報は、利用目的の達成に必要な期間保管し、不要になった場合は適切な方法で廃棄します。',
                '退会後も、法令上の保存義務がある情報および不正利用防止のために必要な情報については、一定期間保管する場合があります。',
              ].map((item, i) => (
                <li key={i} style={{ fontSize: '14px', color: '#444', lineHeight: 1.8 }}>{item}</li>
              ))}
            </ol>
          </section>

          <section>
            <h2 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e8e8e8' }}>
              第9条　未成年者の個人情報
            </h2>
            <ol style={{ paddingLeft: '1.4em', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li style={{ fontSize: '14px', color: '#444', lineHeight: 1.8 }}>
                本サービスは18歳以上（高校生を除く）を対象としています。18歳未満であることが判明した場合、当社は当該ユーザーのアカウントおよびデータを削除します。
              </li>
            </ol>
          </section>

          <section>
            <h2 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e8e8e8' }}>
              第10条　開示・訂正・削除の請求
            </h2>
            <ol style={{ paddingLeft: '1.4em', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li style={{ fontSize: '14px', color: '#444', lineHeight: 1.8 }}>
                ユーザーは、当社が保有する自己の個人情報について、開示・訂正・削除・利用停止を請求することができます。請求はお問い合わせ窓口（<a href="mailto:info@aikano.chat" style={{ color: '#888' }}>info@aikano.chat</a>）までご連絡ください。本人確認の上、法令に従い対応します。
              </li>
            </ol>
          </section>

          <section>
            <h2 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e8e8e8' }}>
              第11条　プライバシーポリシーの変更
            </h2>
            <ol style={{ paddingLeft: '1.4em', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li style={{ fontSize: '14px', color: '#444', lineHeight: 1.8 }}>
                当社は、必要に応じて本プライバシーポリシーを変更することがあります。重要な変更がある場合は、本サービス上で通知します。変更後のポリシーは掲載時点より効力を持ちます。
              </li>
            </ol>
          </section>

          <section>
            <h2 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e8e8e8' }}>
              第12条　お問い合わせ
            </h2>
            <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.8 }}>
              個人情報の取り扱いに関するお問い合わせは、以下までご連絡ください。
            </p>
            <div style={{ marginTop: '12px', fontSize: '14px', color: '#444', lineHeight: 2 }}>
              <p>AiKano 運営事務局</p>
              <p>メールアドレス：<a href="mailto:info@aikano.chat" style={{ color: '#888' }}>info@aikano.chat</a></p>
            </div>
          </section>

        </div>

        <div style={{ marginTop: '64px', paddingTop: '24px', borderTop: '1px solid #e8e8e8' }}>
          <p style={{ fontSize: '13px', color: '#aaa', textAlign: 'center' }}>
            AiKano 運営事務局
          </p>
        </div>
      </div>
    </div>
  )
}
