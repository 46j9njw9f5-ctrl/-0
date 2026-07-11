// 静的プリレンダー（SEO対策）。
// ───────────────────────────────────────────────────────────────
// GitHub Pages のSPAでは、深いURLを直接開くと 404.html 経由の soft-404 になり、
// 初期HTMLのメタも既定値のまま。crawler に正しく届けるため、主要ルートごとに
// dist/<path>/index.html を生成し、正しい title/description/canonical/OGP/robots/
// JSON-LD と、本文プレビュー（見出し＋企業リンク）を埋め込む。
// createRoot（hydrate ではない）なので、埋め込み本文は読み込み時に React が置換する。

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DIST = join(ROOT, 'dist')
const ORIGIN = 'https://46j9njw9f5-ctrl.github.io'
const DATA_UPDATED = '2026年7月'
const MIN_INDEXABLE = 8

const template = readFileSync(join(DIST, 'index.html'), 'utf8')
const companies = JSON.parse(readFileSync(join(ROOT, 'src/data/companies.generated.json'), 'utf8'))

// 都道府県スラッグ（src/engine/region.ts と一致）。
const PREFS = [
  ['北海道', 'hokkaido'], ['青森県', 'aomori'], ['岩手県', 'iwate'], ['宮城県', 'miyagi'], ['秋田県', 'akita'],
  ['山形県', 'yamagata'], ['福島県', 'fukushima'], ['茨城県', 'ibaraki'], ['栃木県', 'tochigi'], ['群馬県', 'gunma'],
  ['埼玉県', 'saitama'], ['千葉県', 'chiba'], ['東京都', 'tokyo'], ['神奈川県', 'kanagawa'], ['新潟県', 'niigata'],
  ['富山県', 'toyama'], ['石川県', 'ishikawa'], ['福井県', 'fukui'], ['山梨県', 'yamanashi'], ['長野県', 'nagano'],
  ['岐阜県', 'gifu'], ['静岡県', 'shizuoka'], ['愛知県', 'aichi'], ['三重県', 'mie'], ['滋賀県', 'shiga'],
  ['京都府', 'kyoto'], ['大阪府', 'osaka'], ['兵庫県', 'hyogo'], ['奈良県', 'nara'], ['和歌山県', 'wakayama'],
  ['鳥取県', 'tottori'], ['島根県', 'shimane'], ['岡山県', 'okayama'], ['広島県', 'hiroshima'], ['山口県', 'yamaguchi'],
  ['徳島県', 'tokushima'], ['香川県', 'kagawa'], ['愛媛県', 'ehime'], ['高知県', 'kochi'], ['福岡県', 'fukuoka'],
  ['佐賀県', 'saga'], ['長崎県', 'nagasaki'], ['熊本県', 'kumamoto'], ['大分県', 'oita'], ['宮崎県', 'miyazaki'],
  ['鹿児島県', 'kagoshima'], ['沖縄県', 'okinawa'],
]

const LABOR_THEMES = [
  {
    slug: 'overtime-low', label: '残業が少ない',
    desc: '月平均残業時間が短い順（公開データがある企業のみ）',
    eligible: (c) => c.laborReal?.avgOvertimeHours != null,
    cmp: (a, b) => a.laborReal.avgOvertimeHours - b.laborReal.avgOvertimeHours,
    stat: (c) => `残業 ${c.laborReal.avgOvertimeHours}h/月`,
  },
  {
    slug: 'paid-leave-high', label: '有給取得率が高い',
    desc: '年次有給休暇の取得率が高い順（公開データがある企業のみ）',
    eligible: (c) => c.laborReal?.paidLeaveRate != null,
    cmp: (a, b) => b.laborReal.paidLeaveRate - a.laborReal.paidLeaveRate,
    stat: (c) => `有給 ${c.laborReal.paidLeaveRate}%`,
  },
]

const byPref = new Map()
for (const c of companies) {
  if (!c.location) continue
  if (!byPref.has(c.location)) byPref.set(c.location, [])
  byPref.get(c.location).push(c)
}

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** テンプレの head を差し替え、本文プレビューを #root に埋め込む。 */
function renderPage({ title, description, path, robots = 'index,follow', jsonLd, bodyHtml = '' }) {
  const url = ORIGIN + path
  let html = template
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
  html = html.replace(/(<meta name="description" content=")[\s\S]*?(" \/>)/, `$1${esc(description)}$2`)
  html = html.replace(/(<link rel="canonical" href=")[\s\S]*?(" \/>)/, `$1${url}$2`)
  html = html.replace(/(<meta property="og:title" content=")[\s\S]*?(" \/>)/, `$1${esc(title)}$2`)
  html = html.replace(/(<meta property="og:description" content=")[\s\S]*?(" \/>)/, `$1${esc(description)}$2`)
  html = html.replace(/(<meta property="og:url" content=")[\s\S]*?(" \/>)/, `$1${url}$2`)
  html = html.replace(/(<meta name="twitter:title" content=")[\s\S]*?(" \/>)/, `$1${esc(title)}$2`)
  html = html.replace(/(<meta name="twitter:description" content=")[\s\S]*?(" \/>)/, `$1${esc(description)}$2`)
  const head = [`<meta name="robots" content="${robots}" />`]
  if (jsonLd) head.push(`<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`)
  html = html.replace('</head>', `    ${head.join('\n    ')}\n  </head>`)
  html = html.replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`)
  return html
}

function write(path, html) {
  const dir = join(DIST, path)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), html, 'utf8')
}

function companyListHtml(list, statFn) {
  const items = list
    .slice(0, 30)
    .map((c, i) => {
      const stat = statFn ? ` <span>${esc(statFn(c))}</span>` : ''
      return `<li><span>${i + 1}.</span> <a href="/company/${esc(c.id)}">${esc(c.name)}</a> <small>${esc(c.industry)}・従業員${c.employees.toLocaleString()}名${stat}</small></li>`
    })
    .join('')
  return `<ol class="pl">${items}</ol>`
}

function jsonLdItemList(name, list) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: list.length,
    itemListElement: list.slice(0, 20).map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${ORIGIN}/company/${c.id}`,
      name: c.name,
    })),
  }
}

const SRC_LINE =
  `<p class="pl-src">出典：Wikidata・厚労省 しょくばらぼ（公開オープンデータ） ／ データ更新：${DATA_UPDATED}<br>` +
  `<small>※ 各スコアは公開データにもとづく参考指標で、現在の企業の状態を断定するものではありません。</small></p>`

let count = 0

// ── 固定ページ ─────────────────────────────────────────────
const FIXED = [
  { path: '/methodology', title: 'スコアの算出方法（将来性・生産性・働きやすさ） | -0（ゼロ）', description: '将来性・生産性・働きやすさスコアの構成要素、労働環境リスクの算出条件、欠損データの補正方法、データソースを説明します。スコアは将来を保証しない独自の参考指標です。' },
  { path: '/privacy', title: 'プライバシーポリシー | -0（ゼロ）', description: '当サイトが保存する情報、Cookie と広告、アフィリエイト、アクセス解析、免責事項についてのプライバシーポリシーです。' },
  { path: '/contact', title: '運営者情報・お問い合わせ | -0（ゼロ）', description: '運営者情報と、サービスへの要望・不具合の報告・データ訂正依頼、スポンサー掲載・データ提供・提携のご相談窓口です。' },
]
for (const p of FIXED) {
  write(p.path, renderPage({ ...p, bodyHtml: `<h1>${esc(p.title.split(' | ')[0])}</h1><p>${esc(p.description)}</p>` }))
  count++
}

// ── 地域ハブ /area ─────────────────────────────────────────
{
  const links = PREFS.map(([name, slug]) => `<a href="/area/${slug}">${esc(name)}</a>`).join(' ')
  write('/area', renderPage({
    title: '地域・条件から企業を探す | -0（ゼロ）',
    description: '都道府県 × 条件（残業が少ない・有給取得率が高い・将来性が高い・隠れ優良）で企業を検索。公開データ（Wikidata・厚労省しょくばらぼ）にもとづく参考指標です。',
    path: '/area',
    bodyHtml: `<h1>地域・条件から企業を探す</h1>${SRC_LINE}<nav class="pl-navs">${links}</nav>`,
  }))
  count++
}

// ── 都道府県ページ /area/:pref と労働テーマ ─────────────────
for (const [name, slug] of PREFS) {
  const inPref = byPref.get(name) ?? []
  const prefIndexable = inPref.length >= MIN_INDEXABLE
  // 「すべて」ページ（従業員規模順のプレビュー。クライアントで将来性順に再描画）
  const sorted = [...inPref].sort((a, b) => b.employees - a.employees)
  const title = `${name}の注目企業ランキング | -0（ゼロ）`
  const desc = `${name}の企業を公開データ（Wikidata・厚労省しょくばらぼ）で比較。将来性・働きやすさ・労働環境リスクの参考指標。${inPref.length}社を掲載。`
  write(`/area/${slug}`, renderPage({
    title, description: desc, path: `/area/${slug}`,
    robots: prefIndexable ? 'index,follow' : 'noindex,follow',
    jsonLd: sorted.length ? jsonLdItemList(`${name}の注目企業`, sorted) : undefined,
    bodyHtml: `<h1>${esc(name)}の注目企業</h1>${SRC_LINE}${companyListHtml(sorted)}`,
  }))
  count++

  for (const t of LABOR_THEMES) {
    const list = inPref.filter(t.eligible).sort(t.cmp)
    const indexable = list.length >= MIN_INDEXABLE
    const tt = `${name}の${t.label}企業ランキング | -0（ゼロ）`
    const td = `${name}の${t.label}企業を公開データ（Wikidata・厚労省しょくばらぼ）で比較。${t.desc}。${list.length}社を掲載。`
    write(`/area/${slug}/${t.slug}`, renderPage({
      title: tt, description: td, path: `/area/${slug}/${t.slug}`,
      robots: indexable ? 'index,follow' : 'noindex,follow',
      jsonLd: list.length ? jsonLdItemList(`${name}の${t.label}企業`, list) : undefined,
      bodyHtml: `<h1>${esc(name)}の${esc(t.label)}企業</h1>${SRC_LINE}${companyListHtml(list, t.stat)}`,
    }))
    count++
  }
}

console.log(`✓ プリレンダー完了: ${count} ページを dist/ に生成`)
