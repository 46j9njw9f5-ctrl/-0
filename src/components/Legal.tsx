import { site, hasAnyAds } from '../monetize/config'

// サイト下部のフッター。プライバシーポリシー・運営者情報・免責事項をまとめて掲載。
// AdSense / アフィリエイト審査で求められる記載を満たすためのページ。
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <details className="policy">
        <summary>プライバシーポリシー</summary>
        <div className="policy__body">
          <p>
            {site.name}（以下「当サイト」）は、利用者のプライバシーを尊重し、以下のとおり個人情報・
            アクセス情報を取り扱います。
          </p>

          <h4>1. 当サイトが保存する情報</h4>
          <p>
            当サイトは会員登録やログインを必要とせず、氏名・住所・メールアドレス等の個人情報を
            収集・送信しません。お気に入りや表示テーマなどの設定は、利用者のブラウザ内
            （ローカルストレージ）にのみ保存され、当サイトの運営者や外部サーバーには送信されません。
          </p>

          <h4>2. Cookie（クッキー）と広告について</h4>
          <p>
            当サイトは、第三者配信の広告サービス（Google
            AdSense 等）を利用する場合があります。これらの事業者は、利用者の興味に応じた広告を
            表示するために Cookie を使用することがあります。Cookie を無効にする方法や、
            パーソナライズ広告の設定は、
            {' '}
            <a href="https://myadcenter.google.com/" target="_blank" rel="noopener noreferrer">
              Google 広告設定
            </a>
            {' '}
            および
            {' '}
            <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">
              Google のポリシー
            </a>
            {' '}
            をご確認ください。
          </p>

          <h4>3. アフィリエイトプログラムについて</h4>
          <p>
            当サイトは、A8.net 等のアフィリエイトプログラムに参加する場合があります。「PR」「広告」と
            表示されたリンクは広告であり、利用者がリンク経由で商品・サービスを申し込むと、当サイトに
            紹介手数料が支払われることがあります。広告の掲載は当サイトの企業評価・順位とは独立しており、
            評価が広告出稿によって変わることはありません。
          </p>

          <h4>4. アクセス解析について</h4>
          <p>
            当サイトは現在アクセス解析ツールを設置していません。将来的に Google
            Analytics 等を導入する場合は、本ポリシーを更新のうえ明記します。
          </p>

          <h4>5. 免責事項</h4>
          <p>
            当サイトの分析・スコアは公開データと独自ロジックに基づく<b>参考情報</b>であり、正確性・
            完全性を保証するものではありません。就職・転職・投資等の意思決定は利用者ご自身の判断と
            責任で行ってください。当サイトの利用により生じた損害について、運営者は責任を負いかねます。
          </p>

          <h4>6. ポリシーの変更</h4>
          <p>本ポリシーは予告なく変更される場合があります。最終更新：{site.policyUpdated}。</p>
        </div>
      </details>

      <details className="policy">
        <summary>運営者情報・お問い合わせ</summary>
        <div className="policy__body">
          <p>
            <b>サイト名：</b>
            {site.name}
          </p>
          <p>
            <b>運営者：</b>
            {site.operator}
          </p>
          <p>
            <b>お問い合わせ：</b>
            <a href={site.contactUrl} target="_blank" rel="noopener noreferrer">
              {site.contactLabel}
            </a>
            {' '}よりご連絡ください。
          </p>
        </div>
      </details>

      <div className="site-footer__meta">
        <span>© {site.name}</span>
        {hasAnyAds() && <span className="site-footer__ad">当サイトは広告（PR）を含みます</span>}
      </div>
    </footer>
  )
}
