import { useEffect, useMemo, useState } from 'react'
import { datasets, type DatasetKey } from './data'
import { evaluate } from './engine/scoring'
import { evaluateGrowth } from './engine/growth'
import { hasLabor, type Company, type Evaluation, type GrowthEvaluation } from './types'
import { CompanyCard } from './components/CompanyCard'
import { CompanyDetail } from './components/CompanyDetail'
import { ComparePanel } from './components/ComparePanel'

interface Row {
  company: Company
  growth: GrowthEvaluation
  evaluation?: Evaluation
}

type SortKey = 'growth' | 'growthLow' | 'white' | 'black' | 'employees' | 'young'

const SORTS: { key: SortKey; label: string; laborOnly?: boolean }[] = [
  { key: 'growth', label: '将来性が高い順' },
  { key: 'growthLow', label: '将来性が低い順' },
  { key: 'employees', label: '規模が大きい順' },
  { key: 'young', label: '設立が新しい順' },
  { key: 'white', label: 'ホワイト度が高い順', laborOnly: true },
  { key: 'black', label: 'ブラック度が高い順', laborOnly: true },
]

const FAV_KEY = 'zero.favorites.v2'

// データセットごとに全企業を評価してキャッシュ。
const evaluatedByDataset: Record<DatasetKey, Row[]> = datasets.reduce(
  (acc, ds) => {
    acc[ds.key] = ds.companies.map((c) => ({
      company: c,
      growth: evaluateGrowth(c),
      evaluation: hasLabor(c) ? evaluate(c) : undefined,
    }))
    return acc
  },
  {} as Record<DatasetKey, Row[]>,
)

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAV_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export default function App() {
  const [datasetKey, setDatasetKey] = useState<DatasetKey>('real')
  const [query, setQuery] = useState('')
  const [industry, setIndustry] = useState('すべて')
  const [sort, setSort] = useState<SortKey>('growth')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [promisingOnly, setPromisingOnly] = useState(false)
  const [safeOnly, setSafeOnly] = useState(false)
  const [favorites, setFavorites] = useState<string[]>(loadFavorites)
  const [compare, setCompare] = useState<string[]>([])
  const [detailId, setDetailId] = useState<string | null>(null)
  const [showCompare, setShowCompare] = useState(false)

  const dataset = datasets.find((d) => d.key === datasetKey)!
  const rows = evaluatedByDataset[datasetKey]

  useEffect(() => {
    localStorage.setItem(FAV_KEY, JSON.stringify(favorites))
  }, [favorites])

  // データセット切替時は選択状態をリセット
  useEffect(() => {
    setIndustry('すべて')
    setQuery('')
    setCompare([])
    setDetailId(null)
    setShowCompare(false)
    if (!dataset.hasLabor && (sort === 'white' || sort === 'black')) setSort('growth')
    if (!dataset.hasLabor) setSafeOnly(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetKey])

  const toggleFavorite = (id: string) =>
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))
  const toggleCompare = (id: string) =>
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 4 ? c : [...c, id]))

  const industries = useMemo(
    () => ['すべて', ...Array.from(new Set(dataset.companies.map((c) => c.industry)))],
    [dataset],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = rows.filter((r) => {
      if (industry !== 'すべて' && r.company.industry !== industry) return false
      if (onlyFavorites && !favorites.includes(r.company.id)) return false
      if (promisingOnly && r.growth.growthScore < 60) return false
      if (safeOnly && r.evaluation && (r.evaluation.level === 'danger' || r.evaluation.level === 'caution'))
        return false
      if (q) {
        const hay = `${r.company.name} ${r.company.industry} ${r.company.location} ${r.company.blurb ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'growth':
          return b.growth.growthScore - a.growth.growthScore
        case 'growthLow':
          return a.growth.growthScore - b.growth.growthScore
        case 'employees':
          return b.company.employees - a.company.employees
        case 'young':
          return (b.company.founded ?? 0) - (a.company.founded ?? 0)
        case 'white':
          return (b.evaluation?.whiteScore ?? -1) - (a.evaluation?.whiteScore ?? -1)
        case 'black':
          return (b.evaluation?.blackScore ?? -1) - (a.evaluation?.blackScore ?? -1)
      }
    })
  }, [rows, query, industry, sort, onlyFavorites, promisingOnly, safeOnly, favorites])

  const detail = detailId ? rows.find((r) => r.company.id === detailId) : null
  const compareRows = compare
    .map((id) => rows.find((r) => r.company.id === id))
    .filter((x): x is Row => Boolean(x))

  const promisingCount = rows.filter((r) => r.growth.growthScore >= 74).length
  const availableSorts = SORTS.filter((s) => !s.laborOnly || dataset.hasLabor)

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="brand__logo">-0</span>
          <span className="brand__tag">就職者のための企業評価プラットフォーム</span>
        </div>
        <div className="subhead">
          実データと独自ロジックで<b>将来性</b>と<b>ブラック企業リスク</b>を可視化。
          現在 <b>{dataset.label}</b> の {dataset.companies.length} 社を分析中
          （うち急成長期 <b style={{ color: 'var(--excellent)' }}>{promisingCount}社</b>）。
        </div>
      </header>

      {/* データセット切替 */}
      <div className="dataset-tabs">
        {datasets.map((d) => (
          <button
            key={d.key}
            className={`dataset-tab ${datasetKey === d.key ? 'dataset-tab--active' : ''}`}
            onClick={() => setDatasetKey(d.key)}
          >
            {d.key === 'real' ? '📊 ' : '🧪 '}
            {d.label}
          </button>
        ))}
      </div>
      <div className="dataset-desc">{dataset.description}</div>

      <div className="controls">
        <input
          className="input"
          placeholder="🔍 企業名・業界・地域で検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          {availableSorts.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="chip-row">
        {industries.map((ind) => (
          <button
            key={ind}
            className={`chip ${industry === ind ? 'chip--active' : ''}`}
            onClick={() => setIndustry(ind)}
          >
            {ind}
          </button>
        ))}
      </div>

      <div className="chip-row" style={{ marginTop: 10 }}>
        <button
          className={`chip ${promisingOnly ? 'chip--active' : ''}`}
          onClick={() => setPromisingOnly((v) => !v)}
        >
          🚀 将来性の高い企業のみ（60点以上）
        </button>
        {dataset.hasLabor && (
          <button className={`chip ${safeOnly ? 'chip--active' : ''}`} onClick={() => setSafeOnly((v) => !v)}>
            🛡 安全な企業のみ（要注意・危険を除外）
          </button>
        )}
        <button
          className={`chip ${onlyFavorites ? 'chip--active' : ''}`}
          onClick={() => setOnlyFavorites((v) => !v)}
        >
          ★ お気に入りのみ（{favorites.length}）
        </button>
      </div>

      <div className="result-meta">{filtered.length} 社を表示中</div>

      {filtered.length === 0 ? (
        <div className="empty">条件に一致する企業がありません。</div>
      ) : (
        <div className="grid">
          {filtered.map((r) => (
            <CompanyCard
              key={r.company.id}
              company={r.company}
              growth={r.growth}
              evaluation={r.evaluation}
              isFavorite={favorites.includes(r.company.id)}
              inCompare={compare.includes(r.company.id)}
              onOpen={() => setDetailId(r.company.id)}
              onToggleFavorite={() => toggleFavorite(r.company.id)}
              onToggleCompare={() => toggleCompare(r.company.id)}
            />
          ))}
        </div>
      )}

      <div className="disclaimer">
        「実データ（Wikidata）」の事実データ（従業員数・設立年・売上・業種）は Wikidata（CC0）由来です。
        将来性スコアは業種見通し等の前提を含む<b>参考値</b>で、投資・就職の助言ではありません。
        労働環境（ブラック度）は、実名企業に推測値を付与しない方針のため、公的労働データの連携時のみ
        算出します。「デモ」データの企業は架空であり、実在の企業とは関係ありません。
      </div>

      {detail && (
        <CompanyDetail
          company={detail.company}
          growth={detail.growth}
          evaluation={detail.evaluation}
          onClose={() => setDetailId(null)}
        />
      )}

      {showCompare && compareRows.length > 0 && (
        <ComparePanel rows={compareRows} onClose={() => setShowCompare(false)} />
      )}

      {compare.length > 0 && (
        <div className="compare-bar">
          <div className="compare-bar__items">
            {compareRows.map((r) => (
              <span className="compare-pill" key={r.company.id}>
                {r.company.name}
                <button onClick={() => toggleCompare(r.company.id)} aria-label="削除">
                  ×
                </button>
              </span>
            ))}
          </div>
          <button className="btn" style={{ flex: '0 0 auto' }} onClick={() => setCompare([])}>
            クリア
          </button>
          <button
            className="btn btn--primary"
            style={{ flex: '0 0 auto' }}
            disabled={compareRows.length < 2}
            onClick={() => setShowCompare(true)}
          >
            {compareRows.length}社を比較
          </button>
        </div>
      )}
    </div>
  )
}
