import type {
  Company,
  Evaluation,
  GrowthEvaluation,
  ProductivityEvaluation,
  WorkabilityEvaluation,
} from '../types'
import { formatYen } from '../ui'
import { Avatar, GrowthBadge, GrowthDonut } from './Bits'

interface Props {
  company: Company
  growth: GrowthEvaluation
  productivity: ProductivityEvaluation
  evaluation?: Evaluation
  workability?: WorkabilityEvaluation
  isFavorite: boolean
  inCompare: boolean
  onOpen: () => void
  onToggleFavorite: () => void
  onToggleCompare: () => void
}

export function CompanyCard({
  company,
  growth,
  productivity,
  evaluation,
  workability,
  isFavorite,
  inCompare,
  onOpen,
  onToggleFavorite,
  onToggleCompare,
}: Props) {
  const m = company.metrics
  return (
    <div className="card">
      <div className="card__top">
        <Avatar company={company} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card__name">{company.name}</div>
          <div className="card__meta">
            {company.industry}・{company.location}・従業員{company.employees.toLocaleString()}名
          </div>
        </div>
      </div>

      <div className="score-wrap">
        <GrowthDonut growth={growth} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <GrowthBadge growth={growth} />
          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
            {growth.revenueCagr !== null
              ? `売上 年率 ${growth.revenueCagr.toFixed(1)}%`
              : company.founded
                ? `設立 ${company.founded}年`
                : company.listed
                  ? '上場企業'
                  : '非上場'}
          </span>
          {evaluation && workability ? (
            <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
              働きやすさ <b style={{ color: 'var(--text)' }}>{workability.score}</b>
              {' ・ '}
              <span style={{ color: evaluation.redFlags.length ? 'var(--danger)' : 'var(--text-faint)' }}>
                ブラック度 {evaluation.blackScore}
                {evaluation.redFlags.length > 0 ? `⚠${evaluation.redFlags.length}` : ''}
              </span>
            </span>
          ) : (
            productivity.score !== null && (
              <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                生産性 <b style={{ color: 'var(--text)' }}>{productivity.score}</b>
                {' ・ 一人当たり '}
                {formatYen(productivity.revenuePerEmployee)}
              </span>
            )
          )}
        </div>
      </div>

      {company.blurb && <p className="card__blurb">{company.blurb}</p>}

      <div className="card__stats">
        {m ? (
          <>
            <Stat val={`${m.avgOvertimeHours}h`} label="月残業" />
            <Stat val={`${m.turnover3yrRate}%`} label="3年離職率" />
            <Stat val={`${m.paidLeaveRate}%`} label="有給消化" />
          </>
        ) : (
          <>
            <Stat val={company.employees.toLocaleString()} label="従業員数" />
            <Stat val={company.founded ? `${company.founded}` : '—'} label="設立年" />
            <Stat val={company.listed ? '上場' : '非上場'} label="上場区分" />
          </>
        )}
      </div>

      {company.source && (
        <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
          出典: {company.source.name}（{company.source.license}）
          {company.website && (
            <>
              {' ・ '}
              <a href={company.website} target="_blank" rel="noreferrer">
                公式サイト
              </a>
            </>
          )}
        </div>
      )}

      <div className="card__actions">
        <button className="btn btn--primary" onClick={onOpen}>
          詳細を見る
        </button>
        <button
          className={`btn ${inCompare ? 'btn--on' : ''}`}
          onClick={onToggleCompare}
          style={{ flex: '0 0 auto', paddingInline: 14 }}
          title="比較に追加"
        >
          {inCompare ? '比較中' : '比較'}
        </button>
        <button
          className={`btn btn--ghost ${isFavorite ? 'btn--on' : ''}`}
          onClick={onToggleFavorite}
          title="お気に入り"
        >
          {isFavorite ? '★' : '☆'}
        </button>
      </div>
    </div>
  )
}

function Stat({ val, label }: { val: string; label: string }) {
  return (
    <div className="stat">
      <div className="stat__val">{val}</div>
      <div className="stat__label">{label}</div>
    </div>
  )
}
