import Link from 'next/link'

export function BlogCta() {
  return (
    <div className="mt-10 rounded-2xl overflow-hidden text-center"
      style={{ background: 'linear-gradient(135deg, #e8438f 0%, #a060e0 100%)' }}>
      <div className="px-6 py-8">
        <div className="inline-block mb-4 px-3 py-1 rounded-full text-xs font-bold"
          style={{ background: 'rgba(255,200,0,0.25)', border: '1px solid rgba(255,200,0,0.5)', color: '#fcd34d' }}>
          🎁 早期登録キャンペーン実施中
        </div>
        <h3 className="text-white font-black text-xl mb-2 leading-snug">
          今アイカノに登録した人だけに<br />3,000円分の特典をプレゼント
        </h3>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.75)' }}>
          サービス開始と同時にポイント付与。登録は無料・30秒で完了。
        </p>
        <Link href="/auth/register"
          className="inline-block font-bold text-sm px-8 py-3 rounded-xl transition-opacity hover:opacity-90"
          style={{ background: '#fff', color: '#e8438f', borderRadius: '12px' }}>
          アイカノ早期登録キャンペーンに参加する（無料）→
        </Link>
        <p className="mt-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>🔒 個人情報は厳重に管理します</p>
      </div>
    </div>
  )
}
