import { PageShell } from '../components/PageShell'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { site } from '../monetize/config'
import { track } from '../analytics/track'

export default function ContactPage() {
  useDocumentMeta({
    title: '運営者情報・お問い合わせ | -0（ゼロ）',
    description:
      '運営者情報と、サービスへの要望・不具合の報告・データ訂正依頼、スポンサー掲載・データ提供・提携のご相談窓口です。',
    path: '/contact',
    ogType: 'article',
  })
  return (
    <PageShell title="運営者情報・お問い合わせ">
      <section className="page__section">
        <h2 className="page__h2">運営者情報</h2>
        <p>
          <b>サイト名：</b>
          {site.name}
        </p>
        <p>
          <b>運営者：</b>
          {site.operator}
        </p>
      </section>

      <section className="page__section">
        <h2 className="page__h2">お問い合わせ</h2>
        <p>
          サービスへの<b>要望</b>、<b>不具合の報告</b>、<b>データの訂正依頼</b>は、以下の GitHub Issues
          よりご連絡ください。内容を確認のうえ対応します。
        </p>
        <p>
          <a className="btn-link" href={site.contactUrl} target="_blank" rel="noopener noreferrer">
            GitHub Issues で問い合わせる ↗
          </a>
        </p>
        <p className="page__muted">
          企業データは公開データ（Wikidata・厚労省 等）に基づいています。特定企業の情報に誤りがある場合も、
          出典の範囲で確認・訂正します（実在企業に推測値を付与することはしません）。
        </p>
      </section>

      <section className="page__section">
        <h2 className="page__h2">事業者・パートナーの方へ</h2>
        <p>
          以下の3種類のご相談を受け付けています。いずれも企業評価・スコア・順位には一切影響しません
          （広告・スポンサーと評価は完全に分離しています）。
        </p>
        <ul className="contact-kinds">
          <li>
            <b>スポンサー掲載</b>：求人・就職支援サービス等の広告掲載のご相談。
          </li>
          <li>
            <b>データ提供</b>：労働環境・採用データ等の提供による評価の拡充。
          </li>
          <li>
            <b>提携</b>：メディア連携・API・共同企画などのご提案。
          </li>
        </ul>
        <p>
          <a
            className="btn-link"
            href={site.contactUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('sponsor_inquiry', { from: 'contact_page' })}
          >
            掲載・提携について問い合わせる ↗
          </a>
        </p>
        <p className="page__muted">
          「スポンサー掲載」「データ提供」「提携」のいずれかを件名に記載いただけると、スムーズにご案内できます。
        </p>
      </section>
    </PageShell>
  )
}
