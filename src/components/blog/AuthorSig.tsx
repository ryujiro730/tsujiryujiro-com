// 千田さつき：記事上部コンパクト版
export function SatsukiAuthorSigCompact({ date }: { date?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0', borderBottom: '1px solid #ececec', marginBottom: '24px' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/author.jpg"
        alt="著者"
        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1.5px solid #f5c6d8' }}
      />
      <div>
        <p style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3 }}>
          千田 さつき
          <span style={{ fontWeight: 400, fontSize: '11px', color: '#aaa', marginLeft: '6px' }}>
            AiKano 編集部
          </span>
        </p>
        {date && (
          <p style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>
            最終更新日：{new Date(date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        )}
      </div>
    </div>
  )
}

// 千田さつき：記事下部フル版
export function SatsukiAuthorSig() {
  return (
    <aside style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '40px',
      alignItems: 'center',
      padding: '40px 0',
      borderTop: '1px solid #ececec',
      marginTop: '8px',
    }}>
      {/* 左：写真 */}
      <div style={{ width: '100%', aspectRatio: '4 / 5', overflow: 'hidden', borderRadius: '12px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/author.jpg"
          alt="千田 さつき"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>

      {/* 右：テキスト */}
      <div>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: '#e8438f', marginBottom: '6px' }}>AUTHOR</p>
        <p style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', marginBottom: '4px', fontFamily: "'Noto Serif JP', serif" }}>
          千田 さつき
        </p>
        <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '16px' }}>Satsuki Senda</p>
        <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.9 }}>
          千田さつきは、AiKano編集部コンテンツマーケティング担当ディレクターです。国公立大学大学院人文学部を卒業後AiKanoへ入社。Webマーケティングの経験はありませんが、学生時代の研究熱心さと勤勉さで猛勉強中です。AiKano学習用データ作成時には多大なる貢献をなされました。Z世代の若きWebマーケターの休日はなんと田舎めぐりが趣味とのこと。
        </p>
      </div>
    </aside>
  )
}

// 記事上部：コンパクト版（名前・役職・日付だけ）
export function AuthorSigCompact({ date }: { date?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0', borderBottom: '1px solid #ececec', marginBottom: '24px' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/author.png"
        alt="著者"
        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1.5px solid #f5c6d8' }}
      />
      <div>
        <p style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3 }}>
          外山 政子
          <span style={{ fontWeight: 400, fontSize: '11px', color: '#aaa', marginLeft: '6px' }}>
            AiKano 編集部
          </span>
        </p>
        {date && (
          <p style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>
            最終更新日：{new Date(date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        )}
      </div>
    </div>
  )
}

// 記事下部：フル版（写真大きめ＋紹介文）
export function AuthorSig({ bio }: { bio?: string }) {
  return (
    <aside style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '40px',
      alignItems: 'center',
      padding: '40px 0',
      borderTop: '1px solid #ececec',
      marginTop: '8px',
    }}>
      {/* 左：写真 */}
      <div style={{ width: '100%', aspectRatio: '4 / 5', overflow: 'hidden', borderRadius: '12px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/author.png"
          alt="外山 政子"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>

      {/* 右：テキスト */}
      <div>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: '#e8438f', marginBottom: '6px' }}>AUTHOR</p>
        <p style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', marginBottom: '4px', fontFamily: "'Noto Serif JP', serif" }}>
          外山 政子
        </p>
        <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '16px' }}>Masako Toyama</p>
        <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.9 }}>
          {bio ?? '政子は、代理​​店や出版社で30年以上の経験を持つコンテンツのエキスパートです。アイカノ編集部部長として当社に入社する前までは、SEO記事の作成をしたことがありませんでしたが、戦略立案、SEOの技術的な側面への深い理解、GoogleSearchConsoleから得られるデータのレポート作成に対する彼女の情熱は、その実績と顧客との良好な関係に表れています。彼女のキーボードが火を吹いていない時間は、愛犬のパグと過ごし、パエリアやトルティージャなどのスペイン料理をクッキングし優雅な休日を過ごしています。男遊びは40後半で卒業したとのこと。'}
        </p>
      </div>
    </aside>
  )
}
