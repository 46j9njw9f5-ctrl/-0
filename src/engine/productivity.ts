import type { Company, ProductivityEvaluation, Tier } from '../types'
import { cleanLatest } from './growth'

/**
 * 生産性評価エンジン。
 * 実データ（売上高・従業員数・営業利益）から「一人当たり売上高」を中心に算出。
 * 一人当たり売上は業種で水準が異なるため、対数スケールで 0–100 に正規化する。
 */

function piecewise(x: number, points: [number, number][]): number {
  if (x <= points[0][0]) return points[0][1]
  const last = points[points.length - 1]
  if (x >= last[0]) return last[1]
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    if (x >= x0 && x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0)
  }
  return last[1]
}

/** 一人当たり売上高（円）→ 生産性スコア 0–100。 */
export function revenuePerEmployeeToScore(yenPerEmployee: number): number {
  const man = yenPerEmployee / 10_000 // 万円
  return Math.round(
    piecewise(man, [
      [300, 15], // 300万円/人
      [1500, 45], // 1,500万円/人
      [3000, 65],
      [5000, 80],
      [10000, 95], // 1億円/人
      [20000, 100],
    ]),
  )
}

function tierOf(score: number): Tier {
  if (score >= 70) return 'high'
  if (score >= 45) return 'mid'
  return 'low'
}

const yen = (v: number): string => {
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)}兆円`
  if (v >= 1e8) return `${(v / 1e8).toFixed(0)}億円`
  if (v >= 1e4) return `${(v / 1e4).toFixed(0)}万円`
  return `${Math.round(v)}円`
}

export function evaluateProductivity(c: Company): ProductivityEvaluation {
  const revenue = cleanLatest(c.revenueHistory)
  const op = c.financials?.operatingIncome ?? null
  const rpe = revenue !== null && c.employees > 0 ? revenue / c.employees : null
  const ppe = op !== null && c.employees > 0 ? op / c.employees : null
  const margin = revenue !== null && op !== null && revenue > 0 ? (op / revenue) * 100 : null
  const score = rpe !== null ? revenuePerEmployeeToScore(rpe) : null
  const tier = score !== null ? tierOf(score) : 'mid'

  let note: string
  if (rpe === null) {
    note = '売上高または従業員数のデータが不足しており、生産性は算出できません。'
  } else {
    const label = tier === 'high' ? '高い' : tier === 'mid' ? '標準的' : '低め'
    note = `一人当たり売上は約 ${yen(rpe)}／人で、生産性は${label}水準です。`
    if (margin !== null) note += ` 営業利益率は ${margin.toFixed(1)}%。`
  }

  return {
    revenuePerEmployee: rpe,
    profitPerEmployee: ppe,
    operatingMargin: margin,
    score,
    tier,
    note,
  }
}
