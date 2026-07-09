import { useState } from 'react'

// 軽量なインラインSVGチャート群。単系列（magnitude/relationship）中心。
// 値・ラベルはテキストトークン（ink）で、マークは単色。ホバーで詳細を表示。

export interface BarDatum {
  label: string
  value: number
  sub?: string
}

/** 横棒（ランキング／業種別平均）。単色・角丸・値ラベル・ホバー。 */
export function HBar({
  data,
  unit = '',
  color = 'var(--standard)',
  max,
}: {
  data: BarDatum[]
  unit?: string
  color?: string
  max?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const m = max ?? Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="hbar">
      {data.map((d, i) => (
        <div
          className="hbar__row"
          key={d.label}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
        >
          <div className="hbar__label" title={d.label}>{d.label}</div>
          <div className="hbar__track">
            <div
              className="hbar__fill"
              style={{ width: `${(d.value / m) * 100}%`, background: color, opacity: hover === null || hover === i ? 1 : 0.55 }}
            />
          </div>
          <div className="hbar__val">
            {d.value}
            {unit}
            {d.sub && <span className="hbar__sub"> {d.sub}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

/** 縦ヒストグラム（分布）。単色・ホバーで件数。 */
export function Histogram({ data, color = 'var(--accent)' }: { data: BarDatum[]; color?: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const m = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="histo">
      {data.map((d, i) => (
        <div
          className="histo__col"
          key={d.label}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
        >
          <div className="histo__barwrap">
            {hover === i && <div className="histo__tip">{d.value.toLocaleString()}社</div>}
            <div className="histo__bar" style={{ height: `${(d.value / m) * 100}%`, background: color, opacity: hover === null || hover === i ? 1 : 0.55 }} />
          </div>
          <div className="histo__label">{d.label}</div>
        </div>
      ))}
    </div>
  )
}

export interface DotDatum {
  x: number
  y: number
  label: string
  color?: string
}

/** 散布図（2軸の関係）。ホバーで企業名。 */
export function Scatter({
  data,
  xLabel,
  yLabel,
  width = 520,
  height = 320,
}: {
  data: DotDatum[]
  xLabel: string
  yLabel: string
  width?: number
  height?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const pad = 34
  const nx = (x: number) => pad + (x / 100) * (width - pad - 10)
  const ny = (y: number) => height - pad - (y / 100) * (height - pad - 10)
  const ticks = [0, 25, 50, 75, 100]
  return (
    <svg className="scatter" viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={`${xLabel} と ${yLabel} の散布図`}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={nx(t)} y1={ny(0)} x2={nx(t)} y2={ny(100)} className="scatter__grid" />
          <line x1={nx(0)} y1={ny(t)} x2={nx(100)} y2={ny(t)} className="scatter__grid" />
          <text x={nx(t)} y={height - pad + 14} className="scatter__tick" textAnchor="middle">{t}</text>
          <text x={pad - 6} y={ny(t) + 3} className="scatter__tick" textAnchor="end">{t}</text>
        </g>
      ))}
      <text x={width / 2} y={height - 4} className="scatter__axis" textAnchor="middle">{xLabel} →</text>
      <text x={-height / 2} y={12} className="scatter__axis" textAnchor="middle" transform="rotate(-90)">{yLabel} →</text>
      {data.map((d, i) => (
        <circle
          key={i}
          cx={nx(d.x)}
          cy={ny(d.y)}
          r={hover === i ? 6.5 : 4.5}
          fill={d.color ?? 'var(--standard)'}
          className="scatter__dot"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
        />
      ))}
      {hover !== null && (
        <g>
          <rect x={Math.min(nx(data[hover].x) + 8, width - 130)} y={Math.max(ny(data[hover].y) - 26, 4)} width={124} height={22} rx={5} className="scatter__tipbox" />
          <text x={Math.min(nx(data[hover].x) + 14, width - 124)} y={Math.max(ny(data[hover].y) - 11, 19)} className="scatter__tiptext">
            {data[hover].label}（{data[hover].x}, {data[hover].y}）
          </text>
        </g>
      )}
    </svg>
  )
}

// 比較用カテゴリカル配色（固定順・CVD検証済み: dark mode 全チェックPASS）。
export const CATEGORICAL = ['#4f8cff', '#c9821f', '#a855f7', '#0f9488']

export interface RadarSeries {
  label: string
  color: string
  values: number[] // axes と同じ順・長さ（0–100）
}

/** レーダーチャート（多軸プロフィール）。単系列は凡例なし、複数系列は凡例つき。 */
export function Radar({
  axes,
  series,
  size = 260,
}: {
  axes: string[]
  series: RadarSeries[]
  size?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const cx = size / 2
  const cy = size / 2
  const R = size / 2 - 40
  const N = axes.length
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / N
  const pt = (i: number, v: number) => {
    const r = (Math.max(0, Math.min(100, v)) / 100) * R
    return [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))]
  }
  const rings = [25, 50, 75, 100]
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, v).map((x) => x.toFixed(1)).join(',')).join(' ')

  return (
    <div className="radar">
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" role="img" aria-label="多軸レーダーチャート">
        {rings.map((rv) => (
          <polygon key={rv} points={poly(axes.map(() => rv))} className="radar__ring" />
        ))}
        {axes.map((a, i) => {
          const [ex, ey] = pt(i, 100)
          const [lx, ly] = pt(i, 118)
          return (
            <g key={a}>
              <line x1={cx} y1={cy} x2={ex} y2={ey} className="radar__spoke" />
              <text x={lx} y={ly} className="radar__axis" textAnchor="middle" dominantBaseline="middle">{a}</text>
            </g>
          )
        })}
        {series.map((s, si) => (
          <g key={s.label} opacity={hover === null || hover === si ? 1 : 0.25}>
            <polygon points={poly(s.values)} fill={s.color} fillOpacity={series.length > 1 ? 0.12 : 0.2} stroke={s.color} strokeWidth={2} />
            {s.values.map((v, i) => {
              const [x, y] = pt(i, v)
              return <circle key={i} cx={x} cy={y} r={3} fill={s.color} />
            })}
          </g>
        ))}
      </svg>
      {series.length > 1 && (
        <div className="radar__legend">
          {series.map((s, si) => (
            <span
              key={s.label}
              className="radar__legend-item"
              onMouseEnter={() => setHover(si)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="radar__swatch" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/** 大きな統計タイル（ヘッドライン数値）。 */
export function StatTile({ value, unit, label, sub }: { value: string; unit?: string; label: string; sub?: string }) {
  return (
    <div className="stat-tile">
      <div className="stat-tile__val">
        {value}
        {unit && <span className="stat-tile__unit">{unit}</span>}
      </div>
      <div className="stat-tile__label">{label}</div>
      {sub && <div className="stat-tile__sub">{sub}</div>}
    </div>
  )
}
