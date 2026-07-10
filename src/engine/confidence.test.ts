import { describe, it, expect } from 'vitest'
import { dataConfidence } from './confidence'
import type { Row } from '../data/rows'

// dataConfidence が読む項目だけを持つ最小の Row を作る。
function row(over: Record<string, unknown>): Row {
  return {
    company: { founded: null },
    growth: { revenueCagr: null, headcountCagr: null },
    productivity: { score: null },
    stock: {},
    workability: undefined,
    evaluation: undefined,
    scores: {},
    ...over,
  } as unknown as Row
}

describe('データ充足度（信頼度）', () => {
  it('実データが乏しい企業は「参考値（低）」になる', () => {
    const c = dataConfidence(row({}))
    expect(c.level).toBe('low')
    expect(c.isReference).toBe(true)
    expect(c.note).toMatch(/参考値/)
    expect(c.filled).toBe(0)
  })

  it('複数の実データに裏付けられれば「高」・参考値ではない', () => {
    const c = dataConfidence(
      row({
        company: { founded: 2010 },
        productivity: { score: 60 },
        workability: { factors: [1, 2, 3] },
        evaluation: { whiteScore: 70 },
      }),
    )
    expect(c.level).toBe('high')
    expect(c.isReference).toBe(false)
    expect(c.filled).toBe(4)
  })

  it('働きやすさが1項目だけなら断定を避ける（thin）', () => {
    const c = dataConfidence(row({ workability: { factors: [1] } }))
    expect(c.workabilityThin).toBe(true)
    expect(c.workabilityFactors).toBe(1)
  })

  it('欠損は0点として扱わず、揃った軸数だけを数える', () => {
    // 生産性だけ実データ → filled=1, level=low だが 0 点扱いではない
    const c = dataConfidence(row({ productivity: { score: 55 } }))
    expect(c.filled).toBe(1)
    expect(c.backedAxes).toEqual(['生産性'])
  })
})
