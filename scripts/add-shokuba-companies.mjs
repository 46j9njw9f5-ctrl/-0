// しょくばらぼ（厚労省 職場情報総合サイト）から、働きやすさ＋基本データを持つ
// 実在企業を大量に追加する。実データのみ（推測値なし）。ブラック度(metrics)は付けない。
//
//   node scripts/add-shokuba-companies.mjs
//   SHOKUBA_CSV=/path/to/shokuba.csv CAP=3000 node scripts/add-shokuba-companies.mjs
//
// 併せて、既存企業(Wikidata由来)の英語・不揃いな業種ラベルを日本語へ正規化する。

import { createReadStream, readFileSync, writeFileSync, existsSync, mkdtempSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DATA = join(ROOT, 'src', 'data', 'companies.generated.json')
const URL = 'https://shokuba.mhlw.go.jp/shokuba/utilize/download010?lang=JA'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
const CAP = Number(process.env.CAP || 3000)

// 列インデックス（0始まり・ヘッダ確認済み）
const COL = {
  corp: 0, name: 1, pref: 5, size: 27, industry: 29, web: 31, founded: 35, sec: 36,
  tenure: 156, age: 178, overtime: 206, paidLeave: 239, women: 408,
}

const ACCENTS = ['#7c6cb2', '#4f9d94', '#4f9679', '#ab7d2c', '#5688ac', '#a9769a', '#6b8fb0', '#8a7bb8']

// 業種正規化: Wikidata英語ラベル・不揃いな表記を日本語カテゴリへ寄せる（タスク2）。
const INDUSTRY_FIX = {
  'optics industry': '精密・光学機器',
  'emergency and relief': 'サービス',
  'real estate industry': '建設・不動産',
  'フォノグラフィック業界': 'メディア・出版',
  'アニメーション制作会社': 'アニメーション産業',
  'エンターテインメント': 'ゲーム・エンタメ',
  '企業内教育': '教育・学習支援',
  '英語教育': '教育・学習支援',
  '学習塾': '教育・学習支援',
  '食物': '食品・飲料',
  '酒造所': '食品・飲料',
  '楽器製作者': '製造業',
  '水運': '物流・運輸',
  '結婚式': 'サービス',
  '求人': 'サービス',
  'プロレス': 'ゲーム・エンタメ',
  'メディア企業': 'メディア・出版',
}

function canonIndustry(raw) {
  let t = String(raw || '').replace(/^[A-Za-z0-9]+[:：]/, '').trim() // "D:建設業"→"建設業"
  t = t.replace(/（他に分類されないもの）/g, '').replace(/，/g, '・').trim()
  return INDUSTRY_FIX[t] || INDUSTRY_FIX[t.toLowerCase()] || t
}

function parseLine(line) {
  const out = []
  let f = '', q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (q) { if (c === '"' && line[i + 1] === '"') { f += '"'; i++ } else if (c === '"') q = false; else f += c }
    else if (c === '"') q = true
    else if (c === ',') { out.push(f); f = '' }
    else f += c
  }
  out.push(f)
  return out
}
const num = (s) => { const m = String(s || '').replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null }
const inRange = (v, lo, hi) => v !== null && v >= lo && v <= hi
const strip = (s) => String(s || '').replace(/^[A-Za-z0-9]+[:：]/, '').trim()

function resolveCsv() {
  if (process.env.SHOKUBA_CSV && existsSync(process.env.SHOKUBA_CSV)) return process.env.SHOKUBA_CSV
  console.log('しょくばらぼ全データをダウンロード中（無認証・約50MB）...')
  const dir = mkdtempSync(join(tmpdir(), 'shokuba-'))
  const zip = join(dir, 'shokuba.zip')
  execSync(`curl -sL -m 300 -A '${UA}' '${URL}' -o '${zip}'`, { stdio: 'ignore' })
  execSync(`unzip -o '${zip}' -d '${dir}'`, { stdio: 'ignore' })
  return execSync(`ls '${dir}'/shokuba_*.csv`).toString().trim()
}

async function main() {
  const csvPath = resolveCsv()
  const companies = JSON.parse(readFileSync(DATA, 'utf8'))

  // (タスク2) 既存企業の業種ラベルを正規化
  let fixed = 0
  for (const c of companies) {
    const nu = canonIndustry(c.industry)
    if (nu !== c.industry) { c.industry = nu; fixed++ }
  }

  // 既存の重複キー
  const seenCorp = new Set()
  const seenName = new Set()
  for (const c of companies) {
    if (c.corporateNumber) seenCorp.add(String(c.corporateNumber).replace(/\D/g, ''))
    seenName.add(c.name)
  }

  const candidates = []
  const dec = new TextDecoder('shift_jis')
  const stream = createReadStream(csvPath)
  let header = null, rec = '', inQ = false

  const handle = (recStr) => {
    const cols = parseLine(recStr)
    if (!header) { header = cols; return }
    const corp = String(cols[COL.corp] || '').replace(/\D/g, '')
    const name = String(cols[COL.name] || '').trim()
    if (!corp || !name || seenCorp.has(corp) || seenName.has(name)) return
    const emp = num(cols[COL.size])
    if (!inRange(emp, 1, 5_000_000)) return // 従業員数は必須（規模・将来性に使用）
    const ot = inRange(num(cols[COL.overtime]), 0, 200) ? num(cols[COL.overtime]) : null
    const pl = inRange(num(cols[COL.paidLeave]), 0, 100) ? num(cols[COL.paidLeave]) : null
    const wm = inRange(num(cols[COL.women]), 0, 100) ? num(cols[COL.women]) : null
    if (ot === null && pl === null && wm === null) return // 働きやすさが1つも無ければ除外
    const age = inRange(num(cols[COL.age]), 15, 70) ? num(cols[COL.age]) : null
    const tenure = inRange(num(cols[COL.tenure]), 0, 50) ? num(cols[COL.tenure]) : null
    const jsicRaw = String(cols[COL.industry] || '').trim() // "D:建設業"（分位比較のキー）
    const foundedM = String(cols[COL.founded] || '').match(/(\d{4})/)
    candidates.push({
      corp, name,
      industry: canonIndustry(cols[COL.industry]),
      jsicRaw,
      pref: strip(cols[COL.pref]),
      emp: Math.round(emp),
      founded: foundedM ? Number(foundedM[1]) : null,
      listed: Boolean(String(cols[COL.sec] || '').replace(/\D/g, '')),
      web: String(cols[COL.web] || '').trim(),
      ot, pl, wm, age, tenure,
      fill: (ot !== null) + (pl !== null) + (wm !== null) + (age !== null),
    })
    seenCorp.add(corp)
    seenName.add(name)
  }

  await new Promise((resolve, reject) => {
    stream.on('data', (chunk) => {
      const text = dec.decode(chunk, { stream: true })
      for (const ch of text) {
        if (ch === '\r') continue
        if (ch === '\n' && !inQ) { handle(rec); rec = ''; continue }
        if (ch === '"') inQ = !inQ
        rec += ch
      }
    })
    stream.on('end', () => { if (rec.trim()) handle(rec); resolve() })
    stream.on('error', reject)
  })

  // 働きやすさデータの充実度→規模 の順で上位 CAP 件を採用
  candidates.sort((a, b) => (b.fill - a.fill) || (b.emp - a.emp))
  const picked = candidates.slice(0, CAP)

  let idx = 0
  for (const x of picked) {
    const laborReal = { source: 'しょくばらぼ（厚労省）' }
    if (x.jsicRaw) laborReal.industryJsic = x.jsicRaw
    if (x.ot !== null) laborReal.avgOvertimeHours = x.ot
    if (x.pl !== null) laborReal.paidLeaveRate = x.pl
    if (x.wm !== null) laborReal.womenManagerRate = x.wm
    if (x.age !== null) laborReal.avgAge = x.age
    if (x.tenure !== null) laborReal.avgTenureYears = x.tenure
    companies.push({
      id: `sk-${x.corp}`,
      name: x.name,
      industry: x.industry,
      location: x.pref || '—',
      employees: x.emp,
      founded: x.founded,
      listed: x.listed,
      ...(x.web ? { website: x.web } : {}),
      accent: ACCENTS[idx++ % ACCENTS.length],
      corporateNumber: x.corp,
      laborReal,
      source: {
        name: 'しょくばらぼ（厚労省 職場情報総合サイト）',
        license: '公開オープンデータ',
        url: 'https://shokuba.mhlw.go.jp/',
      },
    })
  }

  writeFileSync(DATA, JSON.stringify(companies, null, 2), 'utf8')
  console.log(`✓ 業種ラベル修正: ${fixed}件`)
  console.log(`✓ しょくばらぼから ${picked.length}社を追加（候補 ${candidates.length}社）`)
  console.log(`✓ 合計: ${companies.length}社`)
}

main().catch((e) => { console.error(e); process.exit(1) })
