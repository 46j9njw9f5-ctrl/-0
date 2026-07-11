// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AffiliateStrip, CompanyCTA, PartnerRecruit } from './Ad'
import { activeAffiliates, hasAnyAds } from './config'
import { track } from '../analytics/track'

const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('収益化の分離と安全な既定', () => {
  it('スポンサー未設定でも活性アフィリは空（偽リンクを出さない）', () => {
    // 既定の config はプレースホルダのみ → 実案件は0件。
    expect(activeAffiliates()).toHaveLength(0)
    expect(hasAnyAds()).toBe(false)
  })

  it('案件が無いストリップは空枠ではなく「掲載パートナー募集」を表示する', () => {
    wrap(<AffiliateStrip offers={[]} heading="就活に役立つサービス" />)
    expect(screen.getByText('掲載パートナー募集')).toBeInTheDocument()
    // スポンサー枠である明示
    expect(screen.getByText(/広告・スポンサー枠/)).toBeInTheDocument()
  })

  it('掲載枠は問い合わせ（/contact）へ誘導する', () => {
    wrap(<PartnerRecruit />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/contact')
  })

  it('企業CTA: 採用ページは実企業サイトへ、求人枠は案件が無ければ募集中を出す', () => {
    wrap(
      <CompanyCTA companyId="Q1" companyName="テスト社" website="https://example.co.jp" industry="IT・通信" />,
    )
    const site = screen.getByRole('link', { name: /採用・企業ページを見る/ })
    expect(site).toHaveAttribute('href', 'https://example.co.jp')
    // 実企業ページは広告ではないため sponsored を付けない
    expect(site.getAttribute('rel') ?? '').not.toContain('sponsored')
    // 実案件が無いので求人枠は募集中（/contact）
    expect(screen.getByText(/求人サービスを募集中/)).toBeInTheDocument()
  })

  it('track() は分析サービス未設定でも例外を投げない', () => {
    expect(() => track('company_view', { company: 'Q1' })).not.toThrow()
    expect(() => track('outbound_click', { kind: 'company_site' })).not.toThrow()
  })
})
