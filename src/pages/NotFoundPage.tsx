import { Link } from 'react-router-dom'
import { PageShell } from '../components/PageShell'
import { useDocumentMeta } from '../hooks/useDocumentMeta'

export default function NotFoundPage() {
  useDocumentMeta({
    title: 'ページが見つかりません | -0（ゼロ）',
    description: 'お探しのページは見つかりませんでした。企業一覧へお戻りください。',
    path: '/404',
  })
  return (
    <PageShell title="ページが見つかりません">
      <div className="notfound" role="alert">
        <p>お探しのページ（またはURL）は存在しないか、移動された可能性があります。</p>
        <Link className="btn-link" to="/">
          企業一覧へ戻る
        </Link>
      </div>
    </PageShell>
  )
}
