// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { CompanyDetail } from './CompanyDetail'
import { evaluateCompany } from '../data/rows'
import type { Company } from '../types'

// 実データが乏しい（参考値になる）最小の実在しないテスト企業。
const bare = {
  id: 'test-bare',
  name: 'テスト充足度カンパニー',
  industry: 'サービス',
  location: '東京都',
  employees: 120,
  founded: null,
  listed: false,
  accent: '#7c6cb2',
  source: { name: 'テスト', license: 'test', url: 'https://example.com' },
} as Company

function renderDetail(onClose = () => {}) {
  const row = evaluateCompany(bare)
  return render(
    <CompanyDetail
      company={row.company}
      growth={row.growth}
      productivity={row.productivity}
      stock={row.stock}
      evaluation={row.evaluation}
      workability={row.workability}
      scores={row.scores}
      onClose={onClose}
    />,
  )
}

describe('企業詳細モーダルのアクセシビリティ', () => {
  it('dialog に aria-labelledby / aria-describedby が付く', () => {
    renderDetail()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'cd-title')
    expect(dialog).toHaveAttribute('aria-describedby', 'cd-desc')
    // ラベル要素が実在する
    expect(document.getElementById('cd-title')).toHaveTextContent('テスト充足度カンパニー')
  })

  it('タブに role=tab / aria-selected / aria-controls が付く', () => {
    renderDetail()
    const tablist = screen.getByRole('tablist')
    const tabs = within(tablist).getAllByRole('tab')
    expect(tabs.length).toBeGreaterThanOrEqual(2)
    const overview = tabs[0]
    expect(overview).toHaveAttribute('aria-selected', 'true')
    expect(overview).toHaveAttribute('aria-controls', 'cd-panel-overview')
    // 対応する tabpanel が存在
    expect(document.getElementById('cd-panel-overview')).toHaveAttribute('role', 'tabpanel')
  })

  it('Esc キーで onClose が呼ばれる', () => {
    const onClose = vi.fn()
    renderDetail(onClose)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
