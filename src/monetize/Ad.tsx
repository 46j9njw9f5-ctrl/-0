import { useEffect } from 'react'
import { monetize, hasAdsense, type AffiliateOffer } from './config'

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
    <aside className={`ad ${className ?? ''}`.trim()} aria-label="広告">
      <span className="ad__label">広告</span>
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
// 有償リンクなので rel="sponsored nofollow"（Google ガイドライン準拠）。
export function AffiliateCard({ offer }: { offer: AffiliateOffer }) {
  return (
    <a
      className="promo"
      href={offer.url}
      target="_blank"
      rel="sponsored nofollow noopener noreferrer"
      style={offer.accent ? ({ ['--promo-accent' as string]: offer.accent } as React.CSSProperties) : undefined}
    >
      <span className="promo__label" title="広告（アフィリエイト）">
        PR
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

/** 有効なアフィリエイト案件を横並びで表示するストリップ。0件なら null。 */
export function AffiliateStrip({ offers, heading }: { offers: AffiliateOffer[]; heading?: string }) {
  if (!offers.length) return null
  return (
    <section className="promo-strip" aria-label="スポンサー">
      {heading && <div className="promo-strip__head">{heading}</div>}
      <div className="promo-strip__row">
        {offers.map((o) => (
          <AffiliateCard key={o.id} offer={o} />
        ))}
      </div>
    </section>
  )
}
