import { describe, expect, it } from 'vitest'
import { evaluateWorkability } from './workability'

// データ信頼度（働きやすさ主要5項目の充足率）の判定を検証する。
// スコアとは独立に、取得できている項目数で 高(≥80%)/中(50-80%)/低(<50%) を返す。
describe('データ信頼度の算出', () => {
  it('1項目のみ → 低信頼度・参考値', () => {
    const r = evaluateWorkability({ avgOvertimeHours: 15 })
    expect(r.availableCount).toBe(1)
    expect(r.totalCount).toBe(5)
    expect(r.confidence).toBe('low')
    expect(r.isReference).toBe(true)
  })

  it('3項目 → 中信頼度（参考値ではない）', () => {
    const r = evaluateWorkability({
      avgOvertimeHours: 15,
      paidLeaveRate: 70,
      turnover3yrRate: 10,
    })
    expect(r.availableCount).toBe(3)
    expect(r.confidence).toBe('medium')
    expect(r.isReference).toBe(false)
  })

  it('4項目 → 高信頼度', () => {
    const r = evaluateWorkability({
      avgOvertimeHours: 15,
      paidLeaveRate: 70,
      turnover3yrRate: 10,
      avgTenureYears: 12,
    })
    expect(r.availableCount).toBe(4)
    expect(r.confidence).toBe('high')
    expect(r.isReference).toBe(false)
  })

  it('低信頼度のとき参考値フラグが立つ', () => {
    const r = evaluateWorkability({ womenManagerRate: 30 })
    expect(r.confidence).toBe('low')
    expect(r.isReference).toBe(true)
  })

  it('欠損している項目名を列挙する', () => {
    const r = evaluateWorkability({ avgOvertimeHours: 15, paidLeaveRate: 70 })
    expect(r.presentItems).toEqual(['平均残業時間', '有給取得率'])
    expect(r.missingItems).toEqual(['3年以内離職率', '平均勤続年数', '女性管理職比率'])
    expect(r.presentItems.length + r.missingItems.length).toBe(r.totalCount)
  })

  it('全5項目 → 高信頼度・欠損なし', () => {
    const r = evaluateWorkability({
      avgOvertimeHours: 10,
      paidLeaveRate: 85,
      turnover3yrRate: 5,
      avgTenureYears: 15,
      womenManagerRate: 35,
    })
    expect(r.availableCount).toBe(5)
    expect(r.confidence).toBe('high')
    expect(r.isReference).toBe(false)
    expect(r.missingItems).toHaveLength(0)
  })

  it('信頼度とスコアは独立（欠損値を0点にしない）', () => {
    // 1項目でも欠損を0点扱いせず、中立値へ縮約するため極端に低くならない。
    const r = evaluateWorkability({ womenManagerRate: 50 })
    expect(r.confidence).toBe('low')
    expect(r.score).toBeGreaterThan(40)
    expect(r.score).toBeLessThan(70)
  })
})
