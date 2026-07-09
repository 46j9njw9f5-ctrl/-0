import { describe, it, expect } from 'vitest'
import { matchScore, availableAxes } from './fit'

describe('相性診断', () => {
  const scores = { growth: 80, workability: 60, safety: null, productivity: 90, scale: 70 }

  it('選択軸の平均でマッチ度を出す', () => {
    expect(matchScore(scores, ['growth', 'productivity'])).toBe(85)
  })

  it('データが無い軸は平均から除外する', () => {
    // safety は null なので growth のみ
    expect(matchScore(scores, ['growth', 'safety'])).toBe(80)
  })

  it('選択が無ければ null', () => {
    expect(matchScore(scores, [])).toBeNull()
  })

  it('選んだ軸が全て欠損なら null', () => {
    expect(matchScore(scores, ['safety'])).toBeNull()
  })

  it('availableAxes はデータのある軸だけ返す', () => {
    const all = [
      { growth: 50, workability: null, safety: null, productivity: 40, scale: 60 },
      { growth: 70, workability: null, safety: null, productivity: 80, scale: 55 },
    ]
    const keys = availableAxes(all).map((a) => a.key)
    expect(keys).toContain('growth')
    expect(keys).toContain('productivity')
    expect(keys).not.toContain('workability')
    expect(keys).not.toContain('safety')
  })
})
