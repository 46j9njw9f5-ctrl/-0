import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { monetize, hasAdsense, activeAffiliates, type AffiliateOffer } from './config'
import { track } from '../analytics/track'

// ── Google AdSense ────────────────────────────────────────────────
// スクリプトは一度だけ読み込む。ID 未設定なら何もしない（＝空枠を出さない）。
let scriptInjected = false
function ensureAdsenseScript(client: string) {
  if (scriptInjected || typeof document === 'undefined') return
  if (document.querySelector('script[data-adsense]')) {
    scriptInjected = true
    return
  }
  const s = document.createElement('script')
  s.async = true
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`
  s.crossOrigin = 'anonymous'
  s.setAttribute('data-adsense', '1')
  document.head.appendChild(s)
  scriptInjected = true
}

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

/** AdSense ディスプレイ広告枠。ID 未設定時は null を返し、DOM に何も出さない。 */
export function AdSlot({ className }: { className?: string }) {
  useEffect(() => {
    if (!hasAdsense()) return
    ensureAdsenseScript(monetize.adsenseClient)
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      /* AdSense 未ロード時など。次回描画で再試行される */
    }
  }, [])

  if (!hasAdsense()) return null
  return (
    <aside className={`ad ${className ?? ''}`.trim()} aria-label="広告・スポンサー">
      <span className="ad__label">広告・スポンサー</span>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={monetize.adsenseClient}
        data-ad-slot={monetize.adsenseSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  )
}

// ── アフィリエイト案件カード ───────────────────────────────────────
// 有償リンクなので rel="sponsored noopener"（Google ガイドライン準拠）。
export function AffiliateCard({ offer }: { offer: AffiliateOffer }) {
  return (
    <a
      className="promo"
      href={offer.url}
      target="_blank"
      rel="sponsored noopener noreferrer"
      onClick={() => track('outbound_click', { kind: 'affiliate', offer: offer.id })}
      style={offer.accent ? ({ ['--promo-accent' as string]: offer.accent } as React.CSSProperties) : undefined}
    >
      <span className="promo__label" title="広告・スポンサー">
        広告・PR
      </span>
      <div className="promo__body">
        <div className="promo__provider">{offer.provider}</div>
        <div className="promo__title">{offer.title}</div>
        <p className="promo__desc">{offer.description}</p>
      </div>
      <span className="promo__cta">{offer.cta} →</span>
    </a>
  )
}

/**
 * 掲載パートナー募集枠。広告・アフィリが未設定のとき、空枠や偽広告の代わりに
 * 「募集中」を表示する（スコア・順位とは完全に独立）。
 */
export function PartnerRecruit({ compact }: { compact?: boolean }) {
  return (
    <Link
      className={`partner ${compact ? 'partner--compact' : ''}`.trim()}
      to="/contact"
      onClick={() => track('sponsor_inquiry', { from: 'partner_slot' })}
    >
      <span className="partner__label">広告・スポンサー枠</span>
      <div className="partner__body">
        <div className="partner__title">掲載パートナー募集</div>
        {!compact && (
          <p className="partner__desc">
            就職・転職サービスの掲載を募集しています。掲載は企業評価・順位に影響しません。
          </p>
        )}
      </div>
      <span className="partner__cta">お問い合わせ →</span>
    </Link>
  )
}

/**
 * スポンサー案件を横並びで表示する。実リンクが無ければ「掲載パートナー募集」を出す
 * （空枠にしない・偽リンクを出さない）。
 */
export function AffiliateStrip({ offers, heading }: { offers: AffiliateOffer[]; heading?: string }) {
  const hasOffers = offers.length > 0
  return (
    <section className="promo-strip" aria-label="広告・スポンサー">
      {heading && <div className="promo-strip__head">{heading}</div>}
      <div className="promo-strip__row">
        {hasOffers ? offers.map((o) => <AffiliateCard key={o.id} offer={o} />) : <PartnerRecruit />}
      </div>
    </section>
  )
}

/**
 * 企業詳細の「次の行動」CTA。採用ページ・求人サービスなど外部へ接続する。
 * スコアとは独立。外部クリックは計測する。求人枠は実案件が無ければ募集枠を出す。
 */
export function CompanyCTA({
  companyId,
  companyName,
  website,
  industry,
}: {
  companyId: string
  companyName: string
  website?: string
  industry?: string
}) {
  const offers = activeAffiliates()
  const jobOffer = offers[0]
  return (
    <div className="cta" aria-label="次の行動">
      <div className="cta__title">次の行動</div>
      <div className="cta__row">
        {website && (
          <a
            className="cta__btn cta__btn--primary"
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('outbound_click', { kind: 'company_site', company: companyId })}
          >
            採用・企業ページを見る <span aria-hidden="true">↗</span>
          </a>
        )}
        {jobOffer ? (
          <a
            className="cta__btn cta__btn--sponsored"
            href={jobOffer.url}
            target="_blank"
            rel="sponsored noopener noreferrer"
            onClick={() => track('outbound_click', { kind: 'job_service', company: companyId, offer: jobOffer.id })}
          >
            <span className="cta__ad">広告</span>
            {industry ? `${industry}の求人を探す` : '求人を探す'} <span aria-hidden="true">→</span>
          </a>
        ) : (
          <Link
            className="cta__btn cta__btn--muted"
            to="/contact"
            onClick={() => track('sponsor_inquiry', { from: 'company_cta', company: companyId })}
          >
            <span className="cta__ad">広告・スポンサー枠</span>
            求人サービスを募集中 <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
      <p className="cta__note">
        外部リンクは第三者サイトへ移動します。「広告」表示のリンクはスポンサーによる提供で、
        {companyName}の評価・順位には影響しません。
      </p>
    </div>
  )
}
