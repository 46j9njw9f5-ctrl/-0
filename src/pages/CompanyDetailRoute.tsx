import { Link, useNavigate, useParams } from 'react-router-dom'
import { findRowById } from '../data/rows'
import { CompanyDetail } from '../components/CompanyDetail'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { useModalA11y } from '../hooks/useModalA11y'

// /company/:id — 企業一覧の上にモーダルとして詳細を重ねる。
// 直接アクセスでも表示でき、存在しないIDでは一覧へ戻れる404表示を出す。
export default function CompanyDetailRoute() {
  const { id } = useParams()
  const navigate = useNavigate()
  const found = id ? findRowById(id) : null
  const c = found?.row.company

  // 企業データに存在しない値を説明文へ捏造しない（実在の従業員数・業種・所在地のみ使用）。
  useDocumentMeta({
    title: c ? `${c.name}の将来性・働きやすさ・企業評価 | -0（ゼロ）` : '企業が見つかりません | -0（ゼロ）',
    description: c
      ? `${c.name}（${c.industry}・${c.location}）の将来性・生産性・働きやすさをデータで可視化。従業員数 ${c.employees.toLocaleString()} 名。`
      : 'お探しの企業は見つかりませんでした。企業一覧へお戻りください。',
    path: c ? `/company/${c.id}` : '/company',
    ogType: 'article',
  })

  const close = () => navigate('/')

  if (!found) return <CompanyNotFound id={id} onClose={close} />

  const { row } = found
  return (
    <CompanyDetail
      company={row.company}
      growth={row.growth}
      productivity={row.productivity}
      stock={row.stock}
      evaluation={row.evaluation}
      workability={row.workability}
      scores={row.scores}
      onClose={close}
    />
  )
}

function CompanyNotFound({ id, onClose }: { id?: string; onClose: () => void }) {
  const ref = useModalA11y<HTMLDivElement>(onClose)
  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal modal--sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nf-title"
        ref={ref}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tab-body" role="alert">
          <h2 id="nf-title" style={{ marginTop: 0 }}>企業が見つかりません</h2>
          <p>
            指定された企業ID{id ? `（${id}）` : ''}のデータは存在しないか、削除された可能性があります。
          </p>
          <Link className="btn-link" to="/" onClick={onClose}>
            企業一覧へ戻る
          </Link>
        </div>
      </div>
    </div>
  )
}
