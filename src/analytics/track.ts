// プライバシー重視のイベント計測。
// ───────────────────────────────────────────────────────────────
// ・個人情報（氏名・メール・IP紐付け等）は一切送らない。呼び出し側は
//   企業ID・業種・都道府県などの非個人情報のみを props に渡す規約とする。
// ・分析サービス未設定でもアプリは正常に動く（既定は no-op）。
//   VITE_ANALYTICS_ENDPOINT を設定したときだけ軽量にPOSTする。
// ・計測の失敗はアプリの動作に一切影響させない（握りつぶす）。

export type TrackEvent =
  | 'search' // 検索実行
  | 'filter' // フィルター利用
  | 'company_view' // 企業詳細表示
  | 'compare_add' // 比較に追加
  | 'compare_done' // 比較完了（比較パネルを開く）
  | 'outbound_click' // 外部リンク（求人・採用ページ・支援サービス）クリック
  | 'sponsor_inquiry' // スポンサー・掲載の問い合わせ

export type TrackProps = Record<string, string | number | boolean | undefined>

const env = (typeof import.meta !== 'undefined' && import.meta.env) || ({} as Record<string, string>)
const ENDPOINT = String(env.VITE_ANALYTICS_ENDPOINT ?? '').trim()
const DEBUG = Boolean(env.DEV)

/**
 * 匿名イベントを記録する。未設定なら何もしない（開発時のみコンソール出力）。
 * props には個人を特定しうる値を入れないこと。
 */
export function track(event: TrackEvent, props: TrackProps = {}): void {
  try {
    if (DEBUG) console.debug('[track]', event, props)
    if (!ENDPOINT || typeof navigator === 'undefined') return
    const payload = JSON.stringify({
      event,
      props,
      path: typeof location !== 'undefined' ? location.pathname : '',
    })
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(ENDPOINT, payload)
    } else {
      void fetch(ENDPOINT, {
        method: 'POST',
        body: payload,
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {})
    }
  } catch {
    /* 計測はベストエフォート。失敗してもUIに影響させない */
  }
}
