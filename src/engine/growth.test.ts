import { describe, it, expect } from 'vitest'
import { evaluateGrowth, cagr, growthRateToPotential, ageToPotential } from './growth'
import { industryOutlook } from './industry'
import type { Company } from '../types'

function makeCompany(over: Partial<Company> = {}): Company {
  return {
    id: 't',
    name: 'テスト社',
    industry: 'IT・ソフトウェア',
    location: '東京',
    employees: 3000,
    founded: 2010,
    listed: true,
    accent: '#888',
    ...over,
  }
}

describe('CAGR', () => {
  it('2点以上で年平均成長率を返す', () => {
    const r = cagr([
      { year: 2020, value: 100 },
      { year: 2024, value: 200 },
    ])
    expect(r).not.toBeNull()
    // 4年で2倍 ≒ 18.9%/年
    expect(r!).toBeGreaterThan(17)
    expect(r!).toBeLessThan(20)
  })

  it('データ不足なら null', () => {
    expect(cagr(undefined)).toBeNull()
    expect(cagr([{ year: 2020, value: 100 }])).toBeNull()
  })

  it('単位不整合の外れ値を除外する', () => {
    // 大半は兆円規模、1点だけ桁違いの外れ値
    const r = cagr([
      { year: 2020, value: 1_000_000 },
      { year: 2021, value: 1_100_000 },
      { year: 2022, value: 1_200_000 },
      { year: 2023, value: 40 }, // 外れ値
    ])
    expect(r).not.toBeNull()
    // 外れ値が除外され、正の緩やかな成長になる
    expect(r!).toBeGreaterThan(0)
    expect(r!).toBeLessThan(30)
  })

  it('同一年のみで期間が無い場合は null', () => {
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
    expect(industryOutlook('IT・ソフトウェア').score).toBeGreaterThan(
      industryOutlook('訪問販売').score,
    )
    expect(industryOutlook('半導体').score).toBeGreaterThan(70)
  })
})

describe('evaluateGrowth', () => {
  it('成長業種×売上増は高スコア・成長ステージ', () => {
    const e = evaluateGrowth(
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
    expect(e.growthScore).toBeGreaterThan(70)
    expect(['hypergrowth', 'growth']).toContain(e.stage)
    expect(e.revenueCagr).not.toBeNull()
    expect(e.strengths.length).toBeGreaterThan(0)
  })

  it('逆風業種は低スコア・要注意ステージ', () => {
    const e = evaluateGrowth(
      makeCompany({ industry: '訪問販売', founded: 1960, listed: false }),
    )
    expect(e.growthScore).toBeLessThan(50)
    expect(e.stage).toBe('declining')
    expect(e.risks.length).toBeGreaterThan(0)
  })

  it('欠損データは重みを再正規化し、重みの合計は1', () => {
    const e = evaluateGrowth(makeCompany({ revenueHistory: undefined, employeeHistory: undefined, founded: null }))
    const sumW = e.factors.reduce((s, f) => s + f.weight, 0)
    expect(sumW).toBeCloseTo(1, 6)
    // 未取得の要因は寄与0
    const rev = e.factors.find((f) => f.key === 'revenueGrowth')!
    expect(rev.available).toBe(false)
    expect(rev.contribution).toBe(0)
  })

  it('将来性スコアは0–100に収まる', () => {
    const e = evaluateGrowth(makeCompany({ industry: '訪問販売', employees: 10 }))
    expect(e.growthScore).toBeGreaterThanOrEqual(0)
    expect(e.growthScore).toBeLessThanOrEqual(100)
  })
})
