import Image from 'next/image'

export function AuthorSig() {
  return (
    <aside className="mt-12 py-8" style={{ borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
      <div className="flex items-start gap-5">
        <div className="shrink-0">
          <Image
            src="/author.png"
            alt="著者アイコン"
            width={120}
            height={120}
            className="rounded-full object-cover"
            style={{ border: '2px solid var(--color-border-warm)' }}
          />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold tracking-widest mb-1" style={{ color: 'var(--color-primary)' }}>AUTHOR</p>
          <p className="font-bold text-sm mb-1">AiKano 編集部 千田 さつき/Satsuki Senda</p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            AiKano公式ブログの編集チームです♪AIとの会話をもっと楽しむためのヒントや、サービスの最新情報を、読者の方に最適なAIサービスの比較や紹介記事を投稿していきます✨
          </p>
        </div>
      </div>
    </aside>
  )
}
