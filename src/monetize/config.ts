// 収益化（マネタイズ）設定
// ───────────────────────────────────────────────────────────────
// ID / リンクを設定したものだけを有効化する。
// AdSense は「クライアントIDあり・スロットなし」の場合、所有権確認コードだけが有効で
// 広告枠は表示しない。審査中と広告配信中を明確に区別する。

export interface AffiliateOffer {
  id: string
  provider: string
  title: string
  description: string
  cta: string
  url: string
  accent?: string
}

const env = (typeof import.meta !== 'undefined' && import.meta.env) || ({} as Record<string, string>)

const DEFAULTS = {
  adsenseClient: 'ca-pub-6937804420410845',
  adsenseSlot: '',
}

export const monetize = {
  adsenseClient: String(env.VITE_ADSENSE_CLIENT ?? DEFAULTS.adsenseClient).trim(),
  adsenseSlot: String(env.VITE_ADSENSE_SLOT ?? DEFAULTS.adsenseSlot).trim(),

  affiliates: [
    {
      id: 'agent-1',
      provider: '転職エージェント',
      title: '将来性の高い業界へ、プロと一緒に',
      description: '成長業界の非公開求人を紹介。登録は無料、相談だけでもOK。',
      cta: '無料で相談してみる',
      url: 'https://example.com/replace-with-your-affiliate-link',
      accent: 'var(--excellent)',
    },
    {
      id: 'scout-1',
      provider: 'スカウト型サービス',
      title: '待っているだけで、優良企業から声がかかる',
      description: '職務経歴を登録するとホワイト企業からスカウトが届く。',
      cta: '無料登録する',
      url: 'https://example.com/replace-with-your-affiliate-link',
      accent: 'var(--standard)',
    },
    {
      id: 'shindan-1',
      provider: '適職診断',
      title: 'あなたに合う仕事を、数分の診断で',
      description: '強み・価値観から向いている職種を可視化。就活の軸づくりに。',
      cta: '無料で診断する',
      url: 'https://example.com/replace-with-your-affiliate-link',
      accent: 'var(--accent)',
    },
  ] as AffiliateOffer[],
}

export const site = {
  name: '-0（ゼロ）',
  url: 'https://46j9njw9f5-ctrl.github.io/',
  operator: 'ゆう',
  contactUrl: 'https://github.com/46j9njw9f5-ctrl/-0/issues',
  contactLabel: 'GitHub の Issue ページ',
  policyUpdated: '2026年7月',
}

/** AdSenseの所有権確認コードを設置できる状態か。 */
export function hasAdsenseClient(): boolean {
  return /^ca-pub-\d+$/.test(monetize.adsenseClient)
}

/** AdSense広告枠を実際に配信できる状態か。 */
export function hasAdsense(): boolean {
  return hasAdsenseClient() && /^\d+$/.test(monetize.adsenseSlot)
}

/** 実リンクに差し替え済みの案件だけを返す。 */
export function activeAffiliates(): AffiliateOffer[] {
  return monetize.affiliates.filter(
    (affiliate) =>
      affiliate.url &&
      !affiliate.url.includes('example.com') &&
      /^https?:\/\//.test(affiliate.url),
  )
}

/** 実際に表示される広告・アフィリエイトがあるか。 */
export function hasAnyAds(): boolean {
  return hasAdsense() || activeAffiliates().length > 0
}
