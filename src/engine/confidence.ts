// データ充足度（信頼度）の算出。スコアそのものとは分けて提示する。
// 欠損は 0 点として扱わず、「どれだけ実データに裏付けられているか」を表す。
import type { Row } from '../data/rows'

export type ConfidenceLevel = 'high' | 'mid' | 'low'

export interface DataConfidence {
  level: ConfidenceLevel
  /** 高 / 中 / 低 */
  label: string
  /** 実データに裏付けられた評価軸の数 */
  filled: number
  /** 対象の評価軸の数 */
  total: number
  /** 働きやすさを構成する実データ項目数（0 なら未算出） */
  workabilityFactors: number
  /** 働きやすさが1項目以下＝強い断定を避けるべき */
  workabilityThin: boolean
  /** 参考値として扱うべきか（裏付けが乏しい） */
  isReference: boolean
  /** 裏付けのある軸のラベル */
  backedAxes: string[]
  note: string
}

/**
 * Row から実データの充足度を求める。
 * 4つの評価軸（成長トレンド・生産性・働きやすさ・安全度）のうち、
 * 実データに裏付けられている数で信頼度を判定する。
 */
export function dataConfidence(row: Row): DataConfidence {
  const growthBacked =
    row.growth.revenueCagr !== null || row.growth.headcountCagr !== null || row.company.founded !== null
  const prodBacked = row.productivity.score !== null
  const workBacked = !!row.workability
  const safetyBacked = !!row.evaluation
  const workabilityFactors = row.workability ? row.workability.factors.length : 0

  const backedAxes: string[] = []
  if (growthBacked) backedAxes.push('成長トレンド')
  if (prodBacked) backedAxes.push('生産性')
  if (workBacked) backedAxes.push('働きやすさ')
  if (safetyBacked) backedAxes.push('安全度')

  const filled = backedAxes.length
  const total = 4
  const level: ConfidenceLevel = filled >= 3 ? 'high' : filled === 2 ? 'mid' : 'low'
  const workabilityThin = workBacked && workabilityFactors <= 1
  const isReference = filled <= 1

  const note = isReference
    ? '実データが少ないため、スコアは参考値です。'
    : level === 'mid'
      ? '一部の指標は実データ、他は業種などの前提値を含みます。'
      : '複数の実データに裏付けられています。'

  return {
    level,
    label: level === 'high' ? '高' : level === 'mid' ? '中' : '低',
    filled,
    total,
    workabilityFactors,
    workabilityThin,
    isReference,
    backedAxes,
    note,
  }
}
