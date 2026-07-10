import { PageShell } from '../components/PageShell'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { site } from '../monetize/config'

export default function ContactPage() {
  useDocumentMeta({
    title: '運営者情報・お問い合わせ | -0（ゼロ）',
    description:
      '運営者情報と、サービスへの要望・不具合の報告・データ訂正依頼の連絡先（GitHub Issues）のご案内です。',
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
    </PageShell>
  )
}
