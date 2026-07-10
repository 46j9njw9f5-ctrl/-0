// 実データ取得パイプライン（Wikidata SPARQL / 無認証・オープンデータ）。
//
//   node scripts/fetch-companies.mjs
//
// 日本企業の「事実データ」（従業員数・設立年・売上・業種・本社・上場・URL）を取得し、
// 名寄せ・正規化して src/data/companies.generated.json に書き出す。
// 従業員数・売上は複数年の値を history として保持し、将来性分析の成長率に用いる。
//
// ライセンス: Wikidata のデータは CC0。出典として company.source に記録する。

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'src', 'data', 'companies.generated.json')

const ENDPOINT = 'https://query.wikidata.org/sparql'
const UA = 'zero-eval/0.1 (company evaluation research; https://github.com/) node-fetch'

async function sparql(query) {
  const url = `${ENDPOINT}?query=${encodeURIComponent(query)}&format=json`
  const res = await fetch(url, {
    headers: { Accept: 'application/sparql-results+json', 'User-Agent': UA },
  })
  if (!res.ok) throw new Error(`SPARQL ${res.status}: ${await res.text()}`)
  const json = await res.json()
  return json.results.bindings.map((b) => {
    const row = {}
    for (const k of Object.keys(b)) row[k] = b[k].value
    return row
  })
}

const qid = (uri) => uri.split('/').pop()

// --- クエリ ---------------------------------------------------------------

// 事実データ本体。従業員数の最新値を持つ日本企業。
const QUERY_MAIN = `
SELECT ?company ?companyLabel ?inception ?industryLabel ?hqLabel ?prefLabel ?website
       (SAMPLE(?exchange) AS ?exchangeSample)
WHERE {
  ?company wdt:P17 wd:Q17 ;
           wdt:P1128 ?employees ;
           wdt:P452 ?industry .
  FILTER(?employees > 30)
  OPTIONAL { ?company wdt:P571 ?inception }
  OPTIONAL { ?company wdt:P159 ?hq . OPTIONAL { ?hq wdt:P131 ?pref } }
  OPTIONAL { ?company wdt:P856 ?website }
  OPTIONAL { ?company wdt:P414 ?exchange }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "ja,en". }
}
GROUP BY ?company ?companyLabel ?inception ?industryLabel ?hqLabel ?prefLabel ?website
LIMIT 2000`

// 従業員数の時系列（point-in-time 付き）。
const QUERY_EMPLOYEES = `
SELECT ?company ?employees ?time WHERE {
  ?company wdt:P17 wd:Q17 ; p:P1128 ?st .
  ?st ps:P1128 ?employees .
  OPTIONAL { ?st pq:P585 ?time }
  FILTER(?employees > 30)
}`

// 売上高の時系列。
const QUERY_REVENUE = `
SELECT ?company ?revenue ?time WHERE {
  ?company wdt:P17 wd:Q17 ; p:P2139 ?st .
  ?st ps:P2139 ?revenue .
  OPTIONAL { ?st pq:P585 ?time }
}`

/** 任意の金額系プロパティの時系列を取る汎用クエリ。 */
const historyQuery = (prop) => `
SELECT ?company ?value ?time WHERE {
  ?company wdt:P17 wd:Q17 ; wdt:P1128 ?e . FILTER(?e > 800)
  ?company p:${prop} ?st .
  ?st ps:${prop} ?value .
  OPTIONAL { ?st pq:P585 ?time }
}`

// 純利益(P2295)・営業利益(P3362)・時価総額(P2226)。
const QUERY_NETPROFIT = historyQuery('P2295')
const QUERY_OPINCOME = historyQuery('P3362')
const QUERY_MARKETCAP = historyQuery('P2226')

// 株式情報: ティッカー(P249) と 上場市場(P414) のラベル。
const QUERY_MARKET = `
SELECT ?company ?ticker ?exchangeLabel WHERE {
  ?company wdt:P17 wd:Q17 ; wdt:P1128 ?e . FILTER(?e > 800)
  OPTIONAL { ?company wdt:P249 ?ticker }
  OPTIONAL { ?company wdt:P414 ?exch . ?exch rdfs:label ?exchangeLabel . FILTER(lang(?exchangeLabel) = "ja") }
}`

// 法人番号(P3225): 公的労働データ（両立支援DB / しょくばらぼ）との正確な突合に使う。
const QUERY_CORP = `
SELECT ?company ?corp WHERE {
  ?company wdt:P17 wd:Q17 ; wdt:P1128 ?e ; wdt:P3225 ?corp . FILTER(?e > 800)
}`

// --- 正規化ヘルパ ---------------------------------------------------------

/** 時系列を [{year, value}] に整形（年で集約し最新を優先）。 */
function toSeries(rows, valueKey) {
  const byYear = new Map()
  for (const r of rows) {
    const v = Number(r[valueKey])
    if (!Number.isFinite(v) || v <= 0) continue
    const year = r.time ? Number(r.time.slice(0, 4)) : 0
    // 同一年は大きい方（最新申告）を採用
    if (!byYear.has(year) || byYear.get(year) < v) byYear.set(year, v)
  }
  return [...byYear.entries()]
    .map(([year, value]) => ({ year, value }))
    .sort((a, b) => a.year - b.year)
}

/** 年ラベル付き（年不明=0 は末尾）に整形。 */
function pickLatest(series) {
  const withYear = series.filter((s) => s.year > 0)
  const src = withYear.length ? withYear : series
  return src.length ? src[src.length - 1].value : null
}

/** 単位不整合の外れ値を中央値基準で除外してから最新値を返す。 */
function cleanLatest(series) {
  if (!series.length) return null
  const vals = series.map((s) => s.value).sort((a, b) => a - b)
  const median = vals[Math.floor(vals.length / 2)]
  const clean = series.filter((s) => s.value >= median * 0.25 && s.value <= median * 4)
  return pickLatest(clean.length ? clean : series)
}

// 具体的な業種キーワード → 内部カテゴリ（優先度は配列順）。
const INDUSTRY_TABLE = [
  ['半導体', '半導体'],
  ['ソフトウェア', 'IT・ソフトウェア'],
  ['情報技術', 'IT・ソフトウェア'],
  ['information technology', 'IT・ソフトウェア'],
  ['software', 'IT・ソフトウェア'],
  ['インターネット', 'IT・インターネット'],
  ['internet', 'IT・インターネット'],
  ['自動車', '自動車・輸送機器'],
  ['automotive', '自動車・輸送機器'],
  ['オートバイ', '自動車・輸送機器'],
  ['造船', '機械・重工業'],
  ['重工', '機械・重工業'],
  ['軍需', '機械・重工業'],
  ['機械', '機械・重工業'],
  ['精密', '精密・光学機器'],
  ['光学', '精密・光学機器'],
  ['カメラ', '精密・光学機器'],
  ['時計', '精密・光学機器'],
  ['現像', '精密・光学機器'],
  ['consumer electronics', 'エレクトロニクス'],
  ['電子', 'エレクトロニクス'],
  ['電気', 'エレクトロニクス'],
  ['家電', 'エレクトロニクス'],
  ['鉄鋼', '鉄鋼・金属'],
  ['鉄精錬', '鉄鋼・金属'],
  ['非鉄', '鉄鋼・金属'],
  ['金属', '鉄鋼・金属'],
  ['ガラス', '化学・素材'],
  ['化学', '化学・素材'],
  ['製薬', '製薬・医療'],
  ['医薬', '製薬・医療'],
  ['医療', '製薬・医療'],
  ['化粧品', '化粧品・日用品'],
  ['日用消費財', '化粧品・日用品'],
  ['トイレタリー', '化粧品・日用品'],
  ['食品', '食品・飲料'],
  ['飲料', '食品・飲料'],
  ['食産業', '食品・飲料'],
  ['レストラン', '外食・飲食'],
  ['外食', '外食・飲食'],
  ['繊維', '繊維・アパレル'],
  ['紡績', '繊維・アパレル'],
  ['アパレル', '繊維・アパレル'],
  ['ファッション', '繊維・アパレル'],
  ['百貨店', '小売・流通'],
  ['小売', '小売・流通'],
  ['retail', '小売・流通'],
  ['銀行', '金融・保険'],
  ['保険', '金融・保険'],
  ['証券', '金融・保険'],
  ['アセット', '金融・保険'],
  ['金融', '金融・保険'],
  ['不動産', '建設・不動産'],
  ['建設', '建設・不動産'],
  ['鉄道', '物流・運輸'],
  ['航空', '物流・運輸'],
  ['公共交通', '物流・運輸'],
  ['道路運送', '物流・運輸'],
  ['運輸', '物流・運輸'],
  ['物流', '物流・運輸'],
  ['通信', '通信'],
  ['telecommun', '通信'],
  ['石油', 'エネルギー・インフラ'],
  ['電力', 'エネルギー・インフラ'],
  ['ガス', 'エネルギー・インフラ'],
  ['エネルギー', 'エネルギー・インフラ'],
  ['環境資源', 'エネルギー・インフラ'],
  ['ゲーム', 'ゲーム・エンタメ'],
  ['mmorpg', 'ゲーム・エンタメ'],
  ['娯楽', 'ゲーム・エンタメ'],
  ['音楽', 'ゲーム・エンタメ'],
  ['スポーツ', 'ゲーム・エンタメ'],
  ['写真', '精密・光学機器'],
  ['アウトソーシング', 'サービス'],
  ['ビジネス・プロセス', 'サービス'],
  ['出版', 'メディア・出版'],
  ['放送', 'メディア・出版'],
  ['広告', '広告・マーケティング'],
  ['商社', '商社'],
  ['取引', '商社'],
  ['研究', '研究・サービス'],
]

// 具体マッチが無いとき用の汎用ラベル（英語も含む）。
const GENERIC = new Map([
  ['製造業', '製造業'],
  ['manufacturing', '製造業'],
  ['サービス', 'サービス'],
  ['第三次産業', 'サービス'],
  ['サービス業', 'サービス'],
])

/** 複数の業種ラベルから、最も具体的な内部カテゴリを選ぶ。 */
function normalizeIndustry(labels) {
  const list = (labels || []).filter(Boolean)
  for (const [key, cat] of INDUSTRY_TABLE) {
    if (list.some((l) => l.toLowerCase().includes(key.toLowerCase()))) return cat
  }
  for (const l of list) {
    const g = GENERIC.get(l.toLowerCase()) || GENERIC.get(l)
    if (g) return g
  }
  return list[0] || 'その他'
}

const PREFS =
  '北海道 青森 岩手 宮城 秋田 山形 福島 茨城 栃木 群馬 埼玉 千葉 東京 神奈川 新潟 富山 石川 福井 山梨 長野 岐阜 静岡 愛知 三重 滋賀 京都 大阪 兵庫 奈良 和歌山 鳥取 島根 岡山 広島 山口 徳島 香川 愛媛 高知 福岡 佐賀 長崎 熊本 大分 宮崎 鹿児島 沖縄'.split(
    ' ',
  )

/** 所在地ラベルを整形。都道府県が取れていればそれを、日本語の地名なら採用、それ以外は「日本」。 */
function normalizeLocation(pref, hq) {
  const cand = pref || hq || ''
  if (PREFS.some((p) => cand.startsWith(p))) return cand
  if (/[都道府県区市町村]/.test(cand)) return cand
  return '日本'
}

const ACCENTS = [
  '#3b82f6', '#22c55e', '#ec4899', '#0ea5e9', '#f59e0b', '#a855f7',
  '#14b8a6', '#f97316', '#8b5cf6', '#e11d48', '#06b6d4', '#84cc16',
]

// --- メイン ---------------------------------------------------------------

async function main() {
  console.log('Wikidata から取得中...')
  const [main, empRows, revRows, npRows, opRows, mcRows, marketRows, corpRows] = await Promise.all([
    sparql(QUERY_MAIN),
    sparql(QUERY_EMPLOYEES),
    sparql(QUERY_REVENUE),
    sparql(QUERY_NETPROFIT),
    sparql(QUERY_OPINCOME),
    sparql(QUERY_MARKETCAP),
    sparql(QUERY_MARKET),
    sparql(QUERY_CORP),
  ])
  console.log(
    `  facts=${main.length} emp=${empRows.length} rev=${revRows.length} np=${npRows.length} mc=${mcRows.length}`,
  )

  // QID ごとに集約
  const byId = new Map()
  for (const r of main) {
    const id = qid(r.company)
    // 日本語ラベルが QID のまま（未翻訳）なものは英語ラベルを許容
    const label = r.companyLabel && !/^Q\d+$/.test(r.companyLabel) ? r.companyLabel : null
    if (!label) continue
    if (!byId.has(id)) {
      byId.set(id, {
        id,
        name: label,
        industries: new Set(),
        inception: r.inception || null,
        hq: r.hqLabel || null,
        pref: r.prefLabel || null,
        website: r.website || null,
        listed: Boolean(r.exchangeSample),
      })
    }
    const c = byId.get(id)
    if (r.industryLabel && !/^Q\d+$/.test(r.industryLabel)) c.industries.add(r.industryLabel)
    if (!c.inception && r.inception) c.inception = r.inception
    if (!c.website && r.website) c.website = r.website
    if (!c.pref && r.prefLabel) c.pref = r.prefLabel
    if (r.exchangeSample) c.listed = true
  }

  const empByCompany = new Map()
  for (const r of empRows) {
    const id = qid(r.company)
    if (!byId.has(id)) continue
    if (!empByCompany.has(id)) empByCompany.set(id, [])
    empByCompany.get(id).push(r)
  }
  const revByCompany = new Map()
  for (const r of revRows) {
    const id = qid(r.company)
    if (!byId.has(id)) continue
    if (!revByCompany.has(id)) revByCompany.set(id, [])
    revByCompany.get(id).push(r)
  }

  // 金額系プロパティを company ごとに集約するヘルパ
  const groupBy = (rows) => {
    const m = new Map()
    for (const r of rows) {
      const id = qid(r.company)
      if (!byId.has(id)) continue
      if (!m.has(id)) m.set(id, [])
      m.get(id).push(r)
    }
    return m
  }
  const npByCompany = groupBy(npRows)
  const opByCompany = groupBy(opRows)
  const mcByCompany = groupBy(mcRows)

  // ティッカー・上場市場
  const corpById = new Map()
  for (const r of corpRows) {
    const id = qid(r.company)
    if (byId.has(id) && !corpById.has(id)) corpById.set(id, r.corp)
  }

  const isJpExchange = (s) => /東京|名古屋|福岡|札幌|JASDAQ|マザーズ|東証/.test(s)
  const marketById = new Map()
  for (const r of marketRows) {
    const id = qid(r.company)
    if (!byId.has(id)) continue
    const cur = marketById.get(id) || {}
    if (!cur.ticker && r.ticker) cur.ticker = r.ticker
    const ex = r.exchangeLabel
    if (ex && !/^Q\d+$/.test(ex)) {
      // 国内市場を優先（就職者向けのため）
      if (!cur.exchange || (isJpExchange(ex) && !isJpExchange(cur.exchange))) cur.exchange = ex
    }
    marketById.set(id, cur)
  }

  const currentYear = 2025
  let idx = 0
  const companies = []
  for (const c of byId.values()) {
    const empSeries = toSeries(empByCompany.get(c.id) || [], 'employees')
    const revSeries = toSeries(revByCompany.get(c.id) || [], 'revenue')
    const employees = pickLatest(empSeries)
    if (!employees) continue // 従業員数のない企業は除外
    const founded = c.inception ? Number(c.inception.slice(0, 4)) : null
    if (founded && (founded < 1800 || founded > currentYear)) continue

    const industry = normalizeIndustry([...c.industries])
    const netProfit = cleanLatest(toSeries(npByCompany.get(c.id) || [], 'value'))
    const opIncome = cleanLatest(toSeries(opByCompany.get(c.id) || [], 'value'))
    const marketCap = cleanLatest(toSeries(mcByCompany.get(c.id) || [], 'value'))
    const market = marketById.get(c.id) || {}
    const financials = {}
    if (netProfit) financials.netProfit = netProfit
    if (opIncome) financials.operatingIncome = opIncome
    if (marketCap) financials.marketCap = marketCap
    if (market.ticker) financials.ticker = market.ticker
    if (market.exchange) financials.exchange = market.exchange

    companies.push({
      id: c.id,
      name: c.name,
      industry,
      industryRaw: [...c.industries],
      location: normalizeLocation(c.pref, c.hq),
      employees: Math.round(employees),
      founded,
      listed: c.listed || Boolean(market.exchange),
      website: c.website,
      accent: ACCENTS[idx++ % ACCENTS.length],
      employeeHistory: empSeries,
      revenueHistory: revSeries,
      ...(Object.keys(financials).length ? { financials } : {}),
      ...(corpById.get(c.id) ? { corporateNumber: corpById.get(c.id) } : {}),
      source: { name: 'Wikidata', license: 'CC0', url: `https://www.wikidata.org/wiki/${c.id}` },
    })
  }

  // 名前で重複除去し、産業の多様性を保ちつつ規模順に整える
  const seen = new Set()
  const unique = companies.filter((c) => {
    if (seen.has(c.name)) return false
    seen.add(c.name)
    return true
  })
  unique.sort((a, b) => b.employees - a.employees)

  // 産業ごとに最大 120 社までに制限し、多様性を確保（合計は上限 1500）
  const perIndustry = new Map()
  const balanced = []
  for (const c of unique) {
    const n = perIndustry.get(c.industry) || 0
    if (n >= 120) continue
    perIndustry.set(c.industry, n + 1)
    balanced.push(c)
    if (balanced.length >= 1500) break
  }

  writeFileSync(OUT, JSON.stringify(balanced, null, 2), 'utf8')
  console.log(`✓ ${balanced.length} 社を ${OUT} に書き出しました`)
  const industries = [...new Set(balanced.map((c) => c.industry))]
  console.log(`  業種: ${industries.join(', ')}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
