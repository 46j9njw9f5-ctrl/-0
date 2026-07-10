import type { Company, GrowthEvaluation, GrowthFactor, GrowthStage, SeriesPoint } from '../types'
import { industryOutlook } from './industry'

/**
 * 将来性（成長性）評価エンジン。
 *
 * 実データ（従業員数・売上高の推移、設立年、上場、業種）から
 * 「将来性スコア 0–100（高いほど有望）」を算出する。
 * 利用可能な要因で生スコアを計算した後、データ欠損が多い企業は
 * 中立値50へ縮約し、少数の良好指標だけによる過大評価を防ぐ。
 */

const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, value))

function piecewise(x: number, points: [number, number][]): number {
  if (x <= points[0][0]) return points[0][1]
  const last = points[points.length - 1]
  if (x >= last[0]) return last[1]
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / (x1 - x0)
      return y0 + t * (y1 - y0)
    }
  }
  return last[1]
}

const CURRENT_YEAR = new Date().getFullYear()

/**
 * 時系列から年平均成長率(CAGR, %)を算出。単位不整合の外れ値を除外し、
 * 2点以上・1年以上の期間があるときのみ返す。
 */
export function cagr(series: SeriesPoint[] | undefined): number | null {
  if (!series || series.length < 2) return null
  const points = series.filter((point) => point.year > 0 && Number.isFinite(point.value) && point.value > 0)
  if (points.length < 2) return null

  const sortedValues = [...points].map((point) => point.value).sort((a, b) => a - b)
  const median = sortedValues[Math.floor(sortedValues.length / 2)]
  const clean = points
    .filter((point) => point.value >= median * 0.25 && point.value <= median * 4)
    .sort((a, b) => a.year - b.year)
  if (clean.length < 2) return null

  const first = clean[0]
  const last = clean[clean.length - 1]
  const years = last.year - first.year
  if (years < 1) return null

  return (Math.pow(last.value / first.value, 1 / years) - 1) * 100
}

/** 時系列から単位不整合の外れ値を除いた最新値を返す。 */
export function cleanLatest(series: SeriesPoint[] | undefined): number | null {
  if (!series || !series.length) return null
  const points = series.filter((point) => Number.isFinite(point.value) && point.value > 0)
  if (!points.length) return null

  const values = points.map((point) => point.value).sort((a, b) => a - b)
  const median = values[Math.floor(values.length / 2)]
  const clean = points.filter((point) => point.value >= median * 0.25 && point.value <= median * 4)
  const withYear = (clean.length ? clean : points).filter((point) => point.year > 0)
  const use = withYear.length ? withYear : clean.length ? clean : points
  return [...use].sort((a, b) => a.year - b.year)[use.length - 1].value
}

/** CAGR(%) → ポテンシャルポイント(0–100)。 */
export const growthRateToPotential = (pct: number): number =>
  piecewise(pct, [
    [-15, 5],
    [-5, 30],
    [0, 50],
    [5, 66],
    [10, 82],
    [20, 100],
  ])

/** 企業年齢 → ポテンシャル。若く確立した企業ほど伸びしろ。 */
export const ageToPotential = (age: number): number =>
  piecewise(age, [
    [0, 72],
    [5, 84],
    [15, 78],
    [30, 62],
    [60, 50],
    [100, 42],
  ])

/** 従業員規模 → 安定性ポテンシャル。 */
export const scaleToPotential = (employees: number): number =>
  piecewise(employees, [
    [50, 55],
    [500, 70],
    [5000, 72],
    [50000, 64],
    [200000, 58],
  ])

const BASE_WEIGHTS = {
  industry: 0.3,
  revenueGrowth: 0.24,
  headcountGrowth: 0.14,
  age: 0.14,
  scale: 0.08,
  capital: 0.1,
}

const STAGES: Record<GrowthStage, string> = {
  hypergrowth: '急成長期',
  growth: '成長期',
  mature: '成熟・安定',
  declining: '転換期・要注意',
}

function classify(score: number, revenueCagr: number | null): GrowthStage {
  let stage: GrowthStage
  if (score >= 74) stage = 'hypergrowth'
  else if (score >= 60) stage = 'growth'
  else if (score >= 46) stage = 'mature'
  else stage = 'declining'

  if (revenueCagr !== null && revenueCagr <= -5 && stage === 'growth') stage = 'mature'
  return stage
}

function confidenceLabel(coverage: number): string {
  if (coverage >= 0.85) return '高'
  if (coverage >= 0.65) return '中'
  return '低'
}

function outlookText(stage: GrowthStage, company: Company, note: string, coverage: number): string {
  const evidence = `データ充足率${Math.round(coverage * 100)}%（信頼度${confidenceLabel(coverage)}）`
  switch (stage) {
    case 'hypergrowth':
      return `${company.name} は将来性が高い水準。${note}。伸びる市場でキャリアの選択肢が広がりやすい環境です。${evidence}。`
    case 'growth':
      return `${company.name} は成長が見込める水準。${note}。安定と成長のバランスが取りやすいでしょう。${evidence}。`
    case 'mature':
      return `${company.name} は成熟・安定の水準。${note}。大きな成長より安定を重視する人に向きます。${evidence}。`
    case 'declining':
      return `${company.name} は構造的な逆風がある水準。${note}。事業転換の動向とスキルの汎用性を意識したい局面です。${evidence}。`
  }
}

/** 企業の将来性を評価。純粋関数。 */
export function evaluateGrowth(company: Company): GrowthEvaluation {
  const outlook = industryOutlook(company.industry)
  const revenueCagr = cagr(company.revenueHistory)
  const headcountCagr = cagr(company.employeeHistory)
  const age = company.founded ? Math.max(0, CURRENT_YEAR - company.founded) : null

  const raw: (GrowthFactor & { base: number })[] = [
    {
      key: 'industry',
      label: '業種の将来性',
      valueLabel: `${company.industry}｜${outlook.note}`,
      potential: outlook.score,
      available: true,
      base: BASE_WEIGHTS.industry,
      weight: 0,
      contribution: 0,
    },
    {
      key: 'revenueGrowth',
      label: '売上成長率',
      valueLabel: revenueCagr !== null ? `年率 ${revenueCagr.toFixed(1)}%` : 'データ未取得',
      potential: revenueCagr !== null ? growthRateToPotential(revenueCagr) : 50,
      available: revenueCagr !== null,
      base: BASE_WEIGHTS.revenueGrowth,
      weight: 0,
      contribution: 0,
    },
    {
      key: 'headcountGrowth',
      label: '従業員数の成長',
      valueLabel: headcountCagr !== null ? `年率 ${headcountCagr.toFixed(1)}%` : 'データ未取得',
      potential: headcountCagr !== null ? growthRateToPotential(headcountCagr) : 50,
      available: headcountCagr !== null,
      base: BASE_WEIGHTS.headcountGrowth,
      weight: 0,
      contribution: 0,
    },
    {
      key: 'age',
      label: '成長ステージ（企業年齢）',
      valueLabel: age !== null ? `設立${company.founded}年・${age}年目` : 'データ未取得',
      potential: age !== null ? ageToPotential(age) : 55,
      available: age !== null,
      base: BASE_WEIGHTS.age,
      weight: 0,
      contribution: 0,
    },
    {
      key: 'scale',
      label: '事業規模の安定性',
      valueLabel: `従業員 ${company.employees.toLocaleString()}名`,
      potential: scaleToPotential(company.employees),
      available: true,
      base: BASE_WEIGHTS.scale,
      weight: 0,
      contribution: 0,
    },
    {
      key: 'capital',
      label: '資本アクセス（上場）',
      valueLabel: company.listed ? '上場' : '非上場',
      potential: company.listed ? 66 : 54,
      available: true,
      base: BASE_WEIGHTS.capital,
      weight: 0,
      contribution: 0,
    },
  ]

  const coverage = clamp(raw.filter((factor) => factor.available).reduce((sum, factor) => sum + factor.base, 0), 0, 1)
  const normalization = coverage || 1
  const factors: GrowthFactor[] = raw.map((factor) => {
    const weight = factor.available ? factor.base / normalization : 0
    return {
      key: factor.key,
      label: factor.label,
      valueLabel: factor.valueLabel,
      potential: Math.round(factor.potential),
      available: factor.available,
      weight,
      contribution: factor.available ? factor.potential * weight : 0,
    }
  })

  const rawScore = clamp(factors.reduce((sum, factor) => sum + factor.contribution, 0))
  const growthScore = Math.round(clamp(50 + (rawScore - 50) * coverage))
  const stage = classify(growthScore, revenueCagr)

  const strengths: string[] = []
  const risks: string[] = []
  if (outlook.score >= 70) strengths.push(`成長市場（${company.industry}）に位置する`)
  if (outlook.score < 45) risks.push(`構造的な逆風のある業種（${company.industry}）`)
  if (revenueCagr !== null && revenueCagr >= 7) strengths.push(`売上が年率 ${revenueCagr.toFixed(1)}% で伸長`)
  if (revenueCagr !== null && revenueCagr <= -3) risks.push(`売上が年率 ${revenueCagr.toFixed(1)}% で減少`)
  if (headcountCagr !== null && headcountCagr >= 5) strengths.push(`従業員数が年率 ${headcountCagr.toFixed(1)}% で増加（採用拡大）`)
  if (headcountCagr !== null && headcountCagr <= -3) risks.push(`従業員数が年率 ${headcountCagr.toFixed(1)}% で減少`)
  if (age !== null && age <= 20 && age >= 3) strengths.push('若く成長余地のあるステージ')
  if (age !== null && age >= 80) risks.push('歴史が長く、変革スピードが課題になりやすい')
  if (company.listed) strengths.push('上場企業で資金調達・ガバナンス面が安定')
  if (coverage < 0.65) risks.push(`将来性データの充足率が${Math.round(coverage * 100)}%のため、スコアを中立値へ補正`)

  return {
    growthScore,
    stage,
    stageLabel: STAGES[stage],
    factors,
    strengths,
    risks,
    outlook: outlookText(stage, company, outlook.note, coverage),
    revenueCagr,
    headcountCagr,
  }
}
