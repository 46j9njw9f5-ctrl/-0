// 企業の評価結果（Row）の生成とキャッシュ。
// App から切り出し、一覧・企業詳細ページの双方から使えるようにする。
// 性能: データセットごとに遅延評価してキャッシュ（デモは選択時のみ評価）。
import { datasets, type DatasetKey } from '.'
import { evaluate } from '../engine/scoring'
import { evaluateGrowth, scaleToPotential } from '../engine/growth'
import { evaluateProductivity } from '../engine/productivity'
import { evaluateStock } from '../engine/stock'
import { evaluateWorkability } from '../engine/workability'
import type { AxisScores } from '../engine/fit'
import {
  hasLabor,
  type Company,
  type Evaluation,
  type GrowthEvaluation,
  type ProductivityEvaluation,
  type StockSnapshot,
  type WorkabilityEvaluation,
} from '../types'

export interface Row {
  company: Company
  growth: GrowthEvaluation
  productivity: ProductivityEvaluation
  stock: StockSnapshot
  evaluation?: Evaluation
  workability?: WorkabilityEvaluation
  scores: AxisScores
}

export function axisScoresOf(
  growth: GrowthEvaluation,
  productivity: ProductivityEvaluation,
  employees: number,
  evaluation?: Evaluation,
  workability?: WorkabilityEvaluation,
): AxisScores {
  return {
    growth: growth.growthScore,
    productivity: productivity.score,
    scale: scaleToPotential(employees),
    workability: workability?.score ?? null,
    safety: evaluation?.whiteScore ?? null,
  }
}

/** 1社を評価して Row を返す（純粋関数）。 */
export function evaluateCompany(c: Company): Row {
  const growth = evaluateGrowth(c)
  const productivity = evaluateProductivity(c)
  const evaluation = hasLabor(c) ? evaluate(c) : undefined
  const workability = hasLabor(c)
    ? evaluateWorkability(c.metrics)
    : c.laborReal
      ? evaluateWorkability(c.laborReal)
      : undefined
  return {
    company: c,
    growth,
    productivity,
    stock: evaluateStock(c),
    evaluation,
    workability,
    scores: axisScoresOf(growth, productivity, c.employees, evaluation, workability),
  }
}

// データセット単位の評価キャッシュ（初回アクセス時に一度だけ計算）。
const cache: Partial<Record<DatasetKey, Row[]>> = {}

export function getRows(key: DatasetKey): Row[] {
  if (!cache[key]) {
    const ds = datasets.find((d) => d.key === key)
    cache[key] = ds ? ds.companies.map(evaluateCompany) : []
  }
  return cache[key] as Row[]
}

/** 企業IDから Row を引く（企業詳細URLの直接アクセス用。全件評価は行わない）。 */
export function findRowById(id: string): { row: Row; datasetKey: DatasetKey } | null {
  for (const ds of datasets) {
    const c = ds.companies.find((x) => x.id === id)
    if (c) return { row: evaluateCompany(c), datasetKey: ds.key }
  }
  return null
}
