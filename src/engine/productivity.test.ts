import { describe, it, expect } from 'vitest'
import { evaluateProductivity, revenuePerEmployeeToScore } from './productivity'
import { evaluateWorkability } from './workability'
import type { Company, CompanyWithLabor } from '../types'

const base: Company = {
  id: 't',
  name: 'テスト社',
  industry: 'IT・ソフトウェア',
  location: '東京',
  employees: 1000,
  founded: 2000,
  listed: true,
  accent: '#888',
}

describe('生産性', () => {
  it('一人当たり売上が高いほどスコアが高い', () => {
    expect(revenuePerEmployeeToScore(3_000_000)).toBeLessThan(revenuePerEmployeeToScore(100_000_000))
    expect(revenuePerEmployeeToScore(100_000_000)).toBeGreaterThanOrEqual(90)
  })

  it('売上と従業員から一人当たり売上・スコアを算出', () => {
    const e = evaluateProductivity({
      ...base,
      employees: 1000,
      revenueHistory: [{ year: 2024, value: 50_000_000_000 }], // 500億円 / 1000人 = 5000万円/人
      financials: { operatingIncome: 5_000_000_000 },
    })
    expect(e.revenuePerEmployee).toBe(50_000_000)
    expect(e.score).not.toBeNull()
    expect(e.score!).toBeGreaterThan(70)
    expect(e.operatingMargin).toBeCloseTo(10, 5)
  })

  it('売上データが無ければ算出不可', () => {
    const e = evaluateProductivity(base)
    expect(e.revenuePerEmployee).toBeNull()
    expect(e.score).toBeNull()
  })
})

function withLabor(over: Partial<CompanyWithLabor['metrics']> = {}): CompanyWithLabor {
  return {
    ...base,
    metrics: {
      avgOvertimeHours: 15,
      paidLeaveRate: 80,
      turnover3yrRate: 7,
      avgTenureYears: 12,
      overtimePaidRate: 100,
      harassmentIndex: 0,
      laborViolationCount: 0,
      womenManagerRate: 30,
      alwaysHiring: false,
      socialInsurance: true,
      ...over,
    },
  }
}

describe('働きやすさ', () => {
  it('良い労働環境は高スコア', () => {
    const e = evaluateWorkability(withLabor().metrics)
    expect(e.score).toBeGreaterThan(70)
    expect(e.tier).toBe('high')
    expect(e.highlights.length).toBeGreaterThan(0)
  })

  it('過酷な環境は低スコア', () => {
    const e = evaluateWorkability(
      withLabor({ avgOvertimeHours: 90, paidLeaveRate: 15, turnover3yrRate: 50, avgTenureYears: 2, womenManagerRate: 3 }).metrics,
    )
    expect(e.score).toBeLessThan(30)
    expect(e.tier).toBe('low')
  })

  it('スコアは0–100、重み合計は1', () => {
    const e = evaluateWorkability(withLabor().metrics)
    expect(e.score).toBeGreaterThanOrEqual(0)
    expect(e.score).toBeLessThanOrEqual(100)
    const w = e.factors.reduce((s, f) => s + f.weight, 0)
    expect(w).toBeCloseTo(1, 6)
  })

  it('部分的な実データ（残業・有給・女性管理職のみ）でも評価でき、重み合計は1', () => {
    const e = evaluateWorkability({ avgOvertimeHours: 15, paidLeaveRate: 80, womenManagerRate: 30 })
    expect(e.factors.length).toBe(3)
    expect(e.factors.reduce((s, f) => s + f.weight, 0)).toBeCloseTo(1, 6)
    expect(e.score).toBeGreaterThan(60)
  })
})
