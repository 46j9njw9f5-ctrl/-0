import type { Company } from '../types'
import { companies as seed } from './companies'
import generated from './companies.generated.json'

// 実データ（Wikidata・CC0）。事実データ中心で労働指標は未連携。
export const realCompanies = generated as unknown as Company[]

// デモ用シード（架空企業）。労働環境データを含み、ブラック度評価をフル体験できる。
export const demoCompanies = seed as Company[]

export type DatasetKey = 'real' | 'demo'

export interface Dataset {
  key: DatasetKey
  label: string
  description: string
  companies: Company[]
  hasLabor: boolean
}

export const datasets: Dataset[] = [
  {
    key: 'real',
    label: '実データ（Wikidata）',
    description:
      '日本の実在企業の事実データ（従業員数・設立年・売上推移・業種）を Wikidata から取得。将来性分析に対応。労働環境データは未連携。',
    companies: realCompanies,
    hasLabor: false,
  },
  {
    key: 'demo',
    label: 'デモ（労働環境つき）',
    description:
      '架空企業のサンプル。残業・離職率などの労働指標を含み、ブラック度評価をフルに体験できます。',
    companies: demoCompanies,
    hasLabor: true,
  },
]
