import type { CompanyWithLabor, GrowthFactor, Tier, WorkabilityEvaluation } from '../types'
import { overtimeRisk, turnoverRisk, tenureRisk } from './scoring'

/**
 * 働きやすさ評価エンジン。
 * ブラック度が「リスク（避けるべきか）」を測るのに対し、こちらは
 * ワークライフバランス寄りの観点で「どれだけ働きやすいか（0–100、高いほど良い）」を測る。
 */

const clamp = (v: number, min = 0, max = 100): number => Math.max(min, Math.min(max, v))

const WEIGHTS = {
  overtime: 0.3,
  paidLeave: 0.22,
  turnover: 0.2,
  tenure: 0.16,
  diversity: 0.12,
}

function tierOf(score: number): { tier: Tier; label: string } {
  if (score >= 70) return { tier: 'high', label: '働きやすい' }
  if (score >= 50) return { tier: 'mid', label: '標準的' }
  return { tier: 'low', label: '働きにくい' }
}

export function evaluateWorkability(c: CompanyWithLabor): WorkabilityEvaluation {
  const m = c.metrics
  const defs: Omit<GrowthFactor, 'contribution'>[] = [
    {
      key: 'overtime',
      label: '残業の少なさ',
      valueLabel: `${m.avgOvertimeHours}h/月`,
      potential: 100 - overtimeRisk(m.avgOvertimeHours),
      weight: WEIGHTS.overtime,
      available: true,
    },
    {
      key: 'paidLeave',
      label: '有給の取りやすさ',
      valueLabel: `消化率 ${m.paidLeaveRate}%`,
      potential: clamp(m.paidLeaveRate),
      weight: WEIGHTS.paidLeave,
      available: true,
    },
    {
      key: 'retention',
      label: '定着（離職の少なさ）',
      valueLabel: `3年離職 ${m.turnover3yrRate}%`,
      potential: 100 - turnoverRisk(m.turnover3yrRate),
      weight: WEIGHTS.turnover,
      available: true,
    },
    {
      key: 'tenure',
      label: '長く働ける（勤続年数）',
      valueLabel: `${m.avgTenureYears}年`,
      potential: 100 - tenureRisk(m.avgTenureYears),
      weight: WEIGHTS.tenure,
      available: true,
    },
    {
      key: 'diversity',
      label: '多様性（女性管理職）',
      valueLabel: `${m.womenManagerRate}%`,
      potential: clamp(m.womenManagerRate * 2.5),
      weight: WEIGHTS.diversity,
      available: true,
    },
  ]

  const factors: GrowthFactor[] = defs.map((d) => ({
    ...d,
    potential: Math.round(d.potential),
    contribution: d.potential * d.weight,
  }))

  const score = Math.round(clamp(factors.reduce((s, f) => s + f.contribution, 0)))
  const { tier, label } = tierOf(score)

  const highlights: string[] = []
  if (m.avgOvertimeHours <= 20) highlights.push('残業が少なくプライベートを確保しやすい')
  if (m.paidLeaveRate >= 70) highlights.push('有給が取りやすい')
  if (m.turnover3yrRate <= 10) highlights.push('定着率が高く長く働ける')
  if (m.womenManagerRate >= 25) highlights.push('女性の登用が進んでいる')
  if (m.avgTenureYears >= 12) highlights.push('平均勤続が長く安定している')

  return { score, tier, tierLabel: label, factors, highlights }
}
