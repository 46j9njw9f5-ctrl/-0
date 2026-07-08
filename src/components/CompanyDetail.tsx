import type { Company, Evaluation, GrowthEvaluation } from '../types'
import { potentialColor, riskColor } from '../ui'
import { Avatar, GrowthBadge, GrowthDonut, RiskBadge, ScoreDonut, Sparkline } from './Bits'

interface Props {
  company: Company
  growth: GrowthEvaluation
  evaluation?: Evaluation
  onClose: () => void
}

export function CompanyDetail({ company, growth, evaluation, onClose }: Props) {
  const m = company.metrics
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <Avatar company={company} size={52} />
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 22 }}>{company.name}</h2>
            <div className="card__meta">
              {company.industry}・{company.location}・
              {company.listed ? '上場' : '非上場'}
              {company.founded ? `・設立${company.founded}年` : ''}・
              従業員{company.employees.toLocaleString()}名
            </div>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>

        {/* ===== 将来性分析 ===== */}
        <div className="section-title">🚀 将来性分析</div>
        <div className="score-wrap">
          <GrowthDonut growth={growth} size={76} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <GrowthBadge growth={growth} />
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              将来性スコア <b style={{ color: 'var(--text)' }}>{growth.growthScore}</b> / 100
            </span>
          </div>
        </div>
        <div className="verdict" style={{ marginTop: 14 }}>
          {growth.outlook}
        </div>

        {(company.revenueHistory?.length || company.employeeHistory?.length) && (
          <div className="history-row">
            {company.revenueHistory && company.revenueHistory.filter((p) => p.year > 0).length >= 2 && (
              <div className="history">
                <div className="history__label">売上高の推移</div>
                <Sparkline series={company.revenueHistory} color="var(--excellent)" />
              </div>
            )}
            {company.employeeHistory && company.employeeHistory.filter((p) => p.year > 0).length >= 2 && (
              <div className="history">
                <div className="history__label">従業員数の推移</div>
                <Sparkline series={company.employeeHistory} color="var(--standard)" />
              </div>
            )}
          </div>
        )}

        {growth.strengths.length > 0 && (
          <>
            <div className="section-title" style={{ color: 'var(--excellent)' }}>
              ◎ 成長の強み
            </div>
            <ul className="good-list">
              {growth.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </>
        )}
        {growth.risks.length > 0 && (
          <>
            <div className="section-title" style={{ color: 'var(--caution)' }}>
              △ 将来のリスク
            </div>
            <ul className="warn-list">
              {growth.risks.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </>
        )}

        <div className="section-title">将来性スコアの根拠</div>
        <div>
          {growth.factors.map((f) => (
            <div className="factor" key={f.key}>
              <div>
                <div className="factor__label">{f.label}</div>
                <div className="factor__value">
                  {f.valueLabel}
                  {f.available ? `・重み${Math.round(f.weight * 100)}%` : '（未反映）'}
                </div>
              </div>
              <div className="bar">
                <div
                  className="bar__fill"
                  style={{
                    width: `${f.available ? f.potential : 0}%`,
                    background: potentialColor(f.potential),
                    opacity: f.available ? 1 : 0.3,
                  }}
                />
              </div>
              <div
                className="factor__risk"
                style={{ color: f.available ? potentialColor(f.potential) : 'var(--text-faint)' }}
              >
                {f.available ? f.potential : '—'}
              </div>
            </div>
          ))}
          <p style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 10 }}>
            ※ 数値は各要因のポテンシャル（0〜100、高いほど有望）。データ未取得の要因は重みを再配分しています。
          </p>
        </div>

        {/* ===== 労働環境（ブラック度）===== */}
        {evaluation && m ? (
          <>
            <div className="section-title">🛡 労働環境（ブラック度分析）</div>
            <div className="score-wrap">
              <ScoreDonut evaluation={evaluation} size={76} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <RiskBadge evaluation={evaluation} />
                <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                  ホワイト度 <b style={{ color: 'var(--text)' }}>{evaluation.whiteScore}</b> / 100
                </span>
              </div>
            </div>
            <div className="verdict" style={{ marginTop: 14 }}>
              {evaluation.verdict}
            </div>

            {evaluation.redFlags.length > 0 && (
              <>
                <div className="section-title" style={{ color: 'var(--danger)' }}>
                  ⚠ 危険信号（レッドフラグ）
                </div>
                <ul className="flag-list">
                  {evaluation.redFlags.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </>
            )}
            {evaluation.goodPoints.length > 0 && (
              <>
                <div className="section-title" style={{ color: 'var(--excellent)' }}>
                  ◎ 労働環境の良い点
                </div>
                <ul className="good-list">
                  {evaluation.goodPoints.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </>
            )}

            <div className="section-title">ブラック度スコアの根拠</div>
            <div>
              {evaluation.factors.map((f) => (
                <div className="factor" key={f.key}>
                  <div>
                    <div className="factor__label">{f.label}</div>
                    <div className="factor__value">
                      {f.valueLabel}・重み{Math.round(f.weight * 100)}%
                    </div>
                  </div>
                  <div className="bar">
                    <div
                      className="bar__fill"
                      style={{ width: `${f.risk}%`, background: riskColor(f.risk) }}
                    />
                  </div>
                  <div className="factor__risk" style={{ color: riskColor(f.risk) }}>
                    {f.risk}
                  </div>
                </div>
              ))}
            </div>

            <div className="section-title">主要データ</div>
            <div className="kv-grid">
              <Kv label="月平均残業" val={`${m.avgOvertimeHours} h`} />
              <Kv label="有給消化率" val={`${m.paidLeaveRate} %`} />
              <Kv label="3年以内離職率" val={`${m.turnover3yrRate} %`} />
              <Kv label="平均勤続年数" val={`${m.avgTenureYears} 年`} />
              <Kv label="残業代支給率" val={`${m.overtimePaidRate} %`} />
              <Kv label="女性管理職比率" val={`${m.womenManagerRate} %`} />
              {company.avgAnnualSalary && <Kv label="平均年収" val={`${company.avgAnnualSalary} 万円`} />}
              <Kv label="社会保険" val={m.socialInsurance ? '完備' : '未整備'} />
              <Kv label="労基署 是正勧告" val={`${m.laborViolationCount} 件`} />
            </div>
          </>
        ) : (
          <div className="notice">
            🛡 労働環境（残業・離職率・有給消化など）の実データは未連携です。実名企業に推測値を
            付与すると誤解を招くため、公的な労働データ（厚労省しょくばらぼ / gBizINFO 等）の連携時のみ
            ブラック度を算出します。労働環境評価を体験するにはヘッダーの「デモ」データをお試しください。
          </div>
        )}

        {company.source && (
          <div className="source-line">
            出典: <b>{company.source.name}</b>（{company.source.license}）
            {' ・ '}
            <a href={company.source.url} target="_blank" rel="noreferrer">
              データ元
            </a>
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
      </div>
    </div>
  )
}

function Kv({ label, val }: { label: string; val: string }) {
  return (
    <div className="kv">
      <div className="kv__label">{label}</div>
      <div className="kv__val">{val}</div>
    </div>
  )
}
