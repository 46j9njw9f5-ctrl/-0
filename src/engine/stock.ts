import type { Company, StockSnapshot, Tier } from '../types'
import { cagr, cleanLatest } from './growth'

/**
 * 株・投資向けの財務スナップショット。
 * 実データ（売上・利益・時価総額・上場市場）を整形して提示する。
 * 収益性は利益率ベースの簡易評価であり、投資助言ではない。
 */

function profitabilityOf(netMargin: number | null): Tier | null {
  if (netMargin === null) return null
  if (netMargin >= 10) return 'high'
  if (netMargin >= 3) return 'mid'
  return 'low'
}

export function evaluateStock(c: Company): StockSnapshot {
  const revenue = cleanLatest(c.revenueHistory)
  const f = c.financials ?? {}
  const netProfit = f.netProfit ?? null
  const operatingIncome = f.operatingIncome ?? null
  const marketCap = f.marketCap ?? null
  const netMargin = revenue !== null && netProfit !== null && revenue > 0 ? (netProfit / revenue) * 100 : null
  const revenueCagr = cagr(c.revenueHistory)
  const profitability = profitabilityOf(netMargin)
  const hasData = Boolean(revenue || netProfit || marketCap || f.exchange)

  let note: string
  if (!hasData) {
    note = '財務・株式データは未取得です。詳細は EDINET（有価証券報告書）等の連携で補完できます。'
  } else if (netMargin !== null) {
    const label = profitability === 'high' ? '高収益' : profitability === 'mid' ? '標準的な収益性' : '低採算'
    note = `純利益率 ${netMargin.toFixed(1)}%（${label}）。`
    if (revenueCagr !== null) note += ` 売上は年率 ${revenueCagr.toFixed(1)}%。`
  } else {
    note = '一部の財務データのみ取得。純利益率など詳細は EDINET 連携で補完できます。'
  }

  return {
    revenue,
    netProfit,
    operatingIncome,
    netMargin,
    marketCap,
    revenueCagr,
    ticker: f.ticker,
    exchange: f.exchange,
    listed: c.listed,
    hasData,
    profitability,
    note,
  }
}
