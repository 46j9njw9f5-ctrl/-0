import { describe, expect, it } from 'vitest'
import { ageToPotential, cagr, evaluateGrowth, growthRateToPotential } from './growth'
import { industryOutlook } from './industry'
import type { Company } from '../types'

function makeCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: 't',
    name: 'テスト社',
    industry: 'IT・ソフトウェア',
    location: '東京',
    employees: 3000,
    founded: 2010,
    listed: true,
    accent: '#888',
    ...overrides,
  }
}

describe('CAGR', () => {
  it('2点以上で年平均成長率を返す', () => {
    const result = cagr([
      { year: 2020, value: 100 },
      { year: 2024, value: 200 },
    ])
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThan(17)
    expect(result!).toBeLessThan(20)
  })

  it('データ不足ならnull', () => {
    expect(cagr(undefined)).toBeNull()
    expect(cagr([{ year: 2020, value: 100 }])).toBeNull()
  })

  it('単位不整合の外れ値を除外する', () => {
    const result = cagr([
      { year: 2020, value: 1_000_000 },
      { year: 2021, value: 1_100_000 },
      { year: 2022, value: 1_200_000 },
      { year: 2023, value: 40 },
    ])
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThan(0)
    expect(result!).toBeLessThan(30)
  })

  it('同一年のみで期間がない場合はnull', () => {
    expect(
      cagr([
        { year: 2022, value: 100 },
        { year: 2022, value: 120 },
      ]),
    ).toBeNull()
  })
})

describe('個別写像', () => {
  it('成長率が高いほどポテンシャルが高い', () => {
    expect(growthRateToPotential(-15)).toBeLessThan(growthRateToPotential(0))
    expect(growthRateToPotential(0)).toBe(50)
    expect(growthRateToPotential(20)).toBe(100)
  })

  it('企業年齢の写像は若い成長期がピーク', () => {
    expect(ageToPotential(5)).toBeGreaterThan(ageToPotential(100))
    expect(ageToPotential(10)).toBeGreaterThan(ageToPotential(50))
  })

  it('業種アウトルックは成長業種が高い', () => {
    expect(industryOutlook('IT・ソフトウェア').score).toBeGreaterThan(industryOutlook('訪問販売').score)
    expect(industryOutlook('半導体').score).toBeGreaterThan(70)
  })
})

describe('evaluateGrowth', () => {
  it('成長業種と実績データが揃えば高スコアになる', () => {
    const evaluation = evaluateGrowth(
      makeCompany({
        industry: '半導体',
        founded: 2012,
        revenueHistory: [
          { year: 2020, value: 100 },
          { year: 2024, value: 220 },
        ],
        employeeHistory: [
          { year: 2020, value: 1000 },
          { year: 2024, value: 1600 },
        ],
      }),
    )
    expect(evaluation.growthScore).toBeGreaterThan(70)
    expect(['hypergrowth', 'growth']).toContain(evaluation.stage)
    expect(evaluation.revenueCagr).not.toBeNull()
    expect(evaluation.strengths.length).toBeGreaterThan(0)
    expect(evaluation.outlook).toContain('信頼度高')
  })

  it('逆風業種は低めのスコアになる', () => {
    const evaluation = evaluateGrowth(makeCompany({ industry: '訪問販売', founded: 1960, listed: false }))
    expect(evaluation.growthScore).toBeLessThanOrEqual(50)
    expect(['declining', 'mature']).toContain(evaluation.stage)
    expect(evaluation.risks.length).toBeGreaterThan(0)
  })

  it('欠損データは重みを再正規化し、重みの合計は1になる', () => {
    const evaluation = evaluateGrowth(
      makeCompany({ revenueHistory: undefined, employeeHistory: undefined, founded: null }),
    )
    const weightSum = evaluation.factors.reduce((sum, factor) => sum + factor.weight, 0)
    expect(weightSum).toBeCloseTo(1, 6)

    const revenue = evaluation.factors.find((factor) => factor.key === 'revenueGrowth')!
    expect(revenue.available).toBe(false)
    expect(revenue.contribution).toBe(0)
  })

  it('少数の良好指標だけでは高評価にしない', () => {
    const evaluation = evaluateGrowth(
      makeCompany({
        industry: '半導体',
        revenueHistory: undefined,
        employeeHistory: undefined,
        founded: null,
      }),
    )
    expect(evaluation.growthScore).toBeLessThan(70)
    expect(evaluation.risks.join('')).toContain('充足率')
    expect(evaluation.outlook).toContain('信頼度低')
  })

  it('将来性スコアは0–100に収まる', () => {
    const evaluation = evaluateGrowth(makeCompany({ industry: '訪問販売', employees: 10 }))
    expect(evaluation.growthScore).toBeGreaterThanOrEqual(0)
    expect(evaluation.growthScore).toBeLessThanOrEqual(100)
  })
})
