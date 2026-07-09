// 実労働データ連携（トークン不要・公的オープンデータ）。
//
//   node scripts/enrich-positive-db.mjs
//
// 厚労省「女性の活躍推進企業データベース（両立支援のひろば）」のオープンデータ CSV
// （CC 由来・無認証で公開ダウンロード）から、実在企業の
//   ・月平均残業時間  ・年次有給休暇取得率  ・女性管理職比率
// を取得し、法人番号で突合して companies.generated.json の各社に laborReal として追記する。
//
// 実名企業に推測値は付与しない。実データが取れた企業だけ働きやすさ評価を有効化する。

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA = join(__dirname, '..', 'src', 'data', 'companies.generated.json')
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
const BASE = 'https://positive-ryouritsu.mhlw.go.jp/positivedb/opendata/download_b.html?w='

// --- CSV パーサ（クオート対応） ---
function parseCsv(text) {
  const rows = []
  let field = '', record = [], q = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') q = false
      else field += ch
    } else if (ch === '"') q = true
    else if (ch === ',') { record.push(field); field = '' }
    else if (ch === '\n') { record.push(field); rows.push(record); record = []; field = '' }
    else if (ch !== '\r') field += ch
  }
  if (field.length || record.length) { record.push(field); rows.push(record) }
  return rows
}

const digits = (s) => (s || '').replace(/[^0-9]/g, '')
const num = (s) => {
  const v = parseFloat((s || '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(v) ? v : null
}

/** 1都道府県の ZIP をダウンロードして CSV テキストを返す。 */
function fetchPrefCsv(w, dir) {
  const zip = join(dir, `p${w}.zip`)
  try {
    execSync(`curl -sL -m 40 -A '${UA}' '${BASE}${w}' -o '${zip}'`, { stdio: 'ignore' })
    const out = execSync(`unzip -p '${zip}'`, { maxBuffer: 64 * 1024 * 1024 })
    return out.toString('utf8').replace(/^﻿/, '')
  } catch {
    return null
  }
}

/** ヘッダ行から必要な列の位置を特定。 */
function locateColumns(header) {
  const find = (pred) => header.findIndex(pred)
  return {
    name: find((h) => h.replace(/^﻿/, '') === '企業名'),
    corp: find((h) => h === '法人番号'),
    overtime: find((h) => h.includes('平均残業時間(時間)')),
    paidLeave: find((h) => h.includes('年次有給休暇の取得率-対象労働者')),
    women: find((h) => h.includes('管理職に占める女性労働者の割合-割合')),
  }
}

async function main() {
  const companies = JSON.parse(readFileSync(DATA, 'utf8'))
  const byCorp = new Map()
  for (const c of companies) if (c.corporateNumber) byCorp.set(digits(c.corporateNumber), c)
  console.log(`突合対象（法人番号あり）: ${byCorp.size} 社`)

  const dir = mkdtempSync(join(tmpdir(), 'posdb-'))
  const labor = new Map() // 法人番号 -> { overtime, paidLeave, women }
  let scanned = 0

  for (let w = 1; w <= 47; w++) {
    const text = fetchPrefCsv(w, dir)
    if (!text) { process.stdout.write('x'); continue }
    const rows = parseCsv(text)
    if (rows.length < 2) { process.stdout.write('.'); continue }
    const col = locateColumns(rows[0])
    if (col.corp < 0) { process.stdout.write('?'); continue }
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]
      const corp = digits(row[col.corp])
      if (!corp || !byCorp.has(corp)) continue
      const rec = {}
      const ot = col.overtime >= 0 ? num(row[col.overtime]) : null
      // 残業 0h は非公表・範囲表記の可能性が高いため実データから除外
      if (ot !== null && ot > 0) rec.avgOvertimeHours = ot
      const pl = col.paidLeave >= 0 ? num(row[col.paidLeave]) : null
      if (pl !== null && pl > 0) rec.paidLeaveRate = pl
      if (col.women >= 0 && num(row[col.women]) !== null) rec.womenManagerRate = num(row[col.women])
      if (Object.keys(rec).length) labor.set(corp, rec)
    }
    scanned++
    process.stdout.write('#')
  }
  process.stdout.write('\n')
  console.log(`スキャンした都道府県ファイル: ${scanned}`)

  const today = new Date().toISOString().slice(0, 10)
  let enriched = 0
  for (const c of companies) {
    const rec = c.corporateNumber && labor.get(digits(c.corporateNumber))
    if (rec) {
      c.laborReal = { ...rec, source: '厚労省 女性活躍・両立支援DB', asOf: today }
      enriched++
    }
  }

  writeFileSync(DATA, JSON.stringify(companies, null, 2), 'utf8')
  console.log(`✓ ${enriched} 社に実労働データ（残業・有給・女性管理職）を連携しました。`)
}

main().catch((e) => { console.error(e); process.exit(1) })
