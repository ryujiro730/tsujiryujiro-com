declare global {
  interface Window {
    gtag: (...args: unknown[]) => void
  }
}

const GA_ID = 'G-E01TLB4KY3'

function gtag(...args: unknown[]) {
  if (typeof window === 'undefined' || !window.gtag) return
  window.gtag(...args)
}

// ── コンバージョンイベント ──────────────────────────────────

/** 登録完了（onboarding完了時） */
export function trackSignUp(params?: { method?: string; referral_source?: string }) {
  gtag('event', 'sign_up', {
    method: params?.method ?? 'email',
    referral_source: params?.referral_source,
  })
}

/** 課金完了 */
export function trackPurchase(params: { value: number; points: number; item_name: string }) {
  gtag('event', 'purchase', {
    currency: 'JPY',
    value: params.value,
    items: [{
      item_id: 'points',
      item_name: params.item_name,
      quantity: params.points,
      price: params.value,
    }],
  })
}

// ── エンゲージメントイベント ──────────────────────────────────

/** チャット開始（初回メッセージ送信時） */
export function trackChatStart(params: { character_id: string; character_name?: string }) {
  gtag('event', 'chat_start', {
    character_id: params.character_id,
    character_name: params.character_name,
  })
}

/** メッセージ送信 */
export function trackMessageSent(params: { character_id: string; message_count: number }) {
  gtag('event', 'message_sent', {
    character_id: params.character_id,
    message_count: params.message_count,
  })
}

// ── CTA クリック ──────────────────────────────────────────

/** LP・ブログのCTAクリック */
export function trackCtaClick(params: { location: string; article?: string }) {
  gtag('event', 'cta_click', {
    cta_location: params.location,   // 'lp_60s' | 'blog' | 'top' など
    article_slug: params.article,
  })
}

// ── ファネルイベント ──────────────────────────────────────────

/** LP到達 */
export function trackLpView(params: { lp_name: string; ref?: string; utm_campaign?: string }) {
  gtag('event', 'lp_view', {
    lp_name: params.lp_name,
    referral_source: params.ref,
    utm_campaign: params.utm_campaign,
  })
}

/** 登録ページ到達 */
export function trackRegisterPageView(params?: { ref?: string }) {
  gtag('event', 'register_page_view', {
    referral_source: params?.ref,
  })
}

/** オンボーディング開始 */
export function trackOnboardingStart() {
  gtag('event', 'onboarding_start', {})
}

// ── ユーザープロパティ設定 ────────────────────────────────────

/** ログイン後にユーザー属性をGA4に紐付け */
export function setUserProperties(params: {
  user_id?: string
  gender?: string
  age_range?: string    // '20-29', '30-39' などレンジで送る（個人情報保護）
  referral_source?: string
}) {
  if (params.user_id) {
    gtag('config', GA_ID, { user_id: params.user_id })
  }
  gtag('set', 'user_properties', {
    gender: params.gender,
    age_range: params.age_range,
    referral_source: params.referral_source,
  })
}
