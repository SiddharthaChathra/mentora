'use client'

import * as React from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { cn } from '@/lib/utils'
import { useLowBandwidth } from '@/components/providers'
import { useElementWidth } from '@/lib/hooks'
import { NotEnoughData } from '@/components/ui/states'
import type { GlossaryTerm } from '@/lib/glossary'
import { ChartFrame, ChartTooltip, type TableData } from './chart-frame'

// ───────────────────────────── Line trend chart (ref-kouliah "Score Records") ─────────────────────────────
export type TrendPoint = { label: string; value: number | null }

export function LineTrendChart({
  data,
  title,
  description,
  height = 230,
  decimals = 2,
  domainMax = 10,
  valueLabel = 'SGPA',
  compareLabel,
  compact,
  action,
  help,
}: {
  data: TrendPoint[]
  title?: string
  description?: string
  height?: number
  decimals?: number
  domainMax?: number
  valueLabel?: string
  compareLabel?: (prev: TrendPoint) => string
  compact?: boolean
  action?: React.ReactNode
  help?: GlossaryTerm
}) {
  const { lowBandwidth } = useLowBandwidth()
  const [box, boxWidth] = useElementWidth<HTMLDivElement>()
  const points = data
    .filter((d) => d.value != null)
    .map((d, i, arr) => ({
      ...d,
      value: d.value as number,
      delta: i > 0 ? (d.value as number) - (arr[i - 1]!.value as number) : null,
      prev: i > 0 ? arr[i - 1]! : null,
    }))
  const lo = points.length ? Math.max(0, Math.floor(Math.min(...points.map((p) => p.value)) - 1)) : 0
  const table: TableData = {
    caption: title ?? `${valueLabel} by period`,
    columns: ['Period', valueLabel, 'Change'],
    rows: data.map((d, i) => {
      const prev = data
        .slice(0, i)
        .reverse()
        .find((x) => x.value != null)
      return [
        d.label,
        d.value == null ? 'Not calculated' : d.value.toFixed(decimals),
        d.value != null && prev?.value != null
          ? `${d.value - prev.value >= 0 ? '+' : ''}${(d.value - prev.value).toFixed(decimals)}`
          : '—',
      ]
    }),
  }
  const chart =
    points.length < 2 ? (
      <NotEnoughData
        reason={
          points.length === 1
            ? `A trend needs ${valueLabel} for at least two periods.`
            : `No ${valueLabel} has been calculated yet.`
        }
      />
    ) : (
      <div>
        <div ref={box} style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 16, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="ltFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary-500)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--primary-500)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid horizontal={false} stroke="var(--line-strong)" strokeDasharray="4 6" />
              <XAxis
                dataKey="label"
                hide
                padding={{ left: boxWidth / (2 * points.length), right: boxWidth / (2 * points.length) }}
              />
              <YAxis domain={[lo, domainMax]} hide />
              <Tooltip
                cursor={{ stroke: 'var(--primary-600)', strokeWidth: 1, strokeDasharray: '4 4' }}
                content={({ active, payload }) => {
                  const p = payload?.[0]?.payload as (typeof points)[number] | undefined
                  if (!active || !p) return null
                  return (
                    <div className="bg-ink-900 shadow-3 rounded-xl px-3 py-2 text-xs text-white">
                      <p className="font-semibold">
                        {p.label}: <span className="num">{p.value.toFixed(decimals)}</span>
                      </p>
                      {p.delta != null && p.prev && (
                        <p
                          className={cn(
                            'num mt-0.5 font-semibold',
                            p.delta >= 0 ? 'text-success-100' : 'text-danger-100',
                          )}
                        >
                          {p.delta >= 0 ? '↑ +' : '↓ '}
                          {p.delta.toFixed(decimals)}{' '}
                          {compareLabel ? compareLabel(p.prev) : `vs ${p.prev.label}`}
                        </p>
                      )}
                    </div>
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--primary-600)"
                strokeWidth={3}
                fill="url(#ltFill)"
                isAnimationActive={!lowBandwidth}
                animationDuration={600}
                dot={{ r: 4, fill: 'var(--surface)', stroke: 'var(--primary-600)', strokeWidth: 2.5 }}
                activeDot={{ r: 7, fill: 'var(--primary-600)', stroke: 'var(--surface)', strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <ol
          className="mt-2 grid gap-1 text-center"
          style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
        >
          {points.map((p) => (
            <li key={p.label} className="min-w-0">
              <p className="num-display text-ink-900 text-base font-semibold">{p.value.toFixed(decimals)}</p>
              <p className="text-ink-500 truncate text-xs">{p.label}</p>
            </li>
          ))}
        </ol>
      </div>
    )
  if (compact) return chart
  return (
    <ChartFrame
      title={title ?? `${valueLabel} records`}
      description={description}
      table={table}
      action={action}
      help={help}
    >
      {chart}
    </ChartFrame>
  )
}

/** SGPA convenience wrapper. */
export function SgpaTrend({
  semesters,
  compact,
  height,
  title = 'SGPA Records',
  action,
}: {
  semesters: { semesterNo: number; sgpa: number | null }[]
  compact?: boolean
  height?: number
  title?: string
  action?: React.ReactNode
}) {
  return (
    <LineTrendChart
      data={semesters.map((s) => ({ label: `Sem ${s.semesterNo}`, value: s.sgpa }))}
      title={title}
      description="Semester-wise SGPA on a 10-point scale"
      compact={compact}
      height={height}
      compareLabel={(p) => `vs ${p.label}`}
      action={action}
      help="SGPA"
    />
  )
}

// ───────────────────────────── MSE vs SEE dumbbell (optional "compare" view) ─────────────────────────────
export type DumbbellRow = {
  code: string
  name: string
  msePct: number | null
  seePct: number | null
  note?: string
}

export function MseSeeDumbbell({ rows, semesterLabel }: { rows: DumbbellRow[]; semesterLabel: string }) {
  const [hover, setHover] = React.useState<{ i: number; x: number; y: number } | null>(null)
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const comparable = rows.filter((r) => r.msePct != null && r.seePct != null)
  const skipped = rows.filter((r) => r.msePct == null || r.seePct == null)
  const table: TableData = {
    caption: `MSE vs SEE percentage by subject, ${semesterLabel}`,
    columns: ['Subject', 'MSE %', 'SEE %', 'Change'],
    rows: rows.map((r) => [
      `${r.code} · ${r.name}`,
      r.msePct == null ? 'n/a' : r.msePct.toFixed(1),
      r.seePct == null ? 'n/a' : r.seePct.toFixed(1),
      r.msePct != null && r.seePct != null
        ? `${r.seePct - r.msePct > 0 ? '+' : ''}${(r.seePct - r.msePct).toFixed(1)}`
        : (r.note ?? 'Not comparable'),
    ]),
  }
  const rowH = 44
  const left = width < 420 ? 72 : 120
  const right = 24
  const pos = (v: number) => left + ((width - left - right) * v) / 100
  return (
    <ChartFrame
      title="MSE → SEE change"
      description={`Compared as percentages, only where maximum marks exist · ${semesterLabel}`}
      table={table}
    >
      {comparable.length === 0 ? (
        <NotEnoughData reason="MSE and SEE can only be compared when both have marks and maximum marks." />
      ) : (
        <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
          <div className="text-ink-700 mb-3 flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <span className="border-primary-600 bg-surface size-2.5 rounded-full border-2" /> MSE
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="bg-success-500 size-2.5 rounded-full" /> SEE
            </span>
          </div>
          <svg
            width={width}
            height={comparable.length * rowH + 28}
            role="img"
            aria-label="MSE versus SEE percentages per subject"
          >
            {[0, 25, 50, 75, 100].map((t) => (
              <line
                key={t}
                x1={pos(t)}
                x2={pos(t)}
                y1={0}
                y2={comparable.length * rowH}
                stroke="var(--line-strong)"
                strokeDasharray="4 6"
              />
            ))}
            {comparable.map((r, i) => {
              const y = i * rowH + rowH / 2
              const up = r.seePct! >= r.msePct!
              return (
                <g
                  key={r.code}
                  onMouseMove={(e) => {
                    const box = ref.current!.getBoundingClientRect()
                    setHover({ i, x: e.clientX - box.left, y: e.clientY - box.top })
                  }}
                >
                  <rect
                    x="0"
                    y={y - rowH / 2}
                    width={width}
                    height={rowH}
                    fill={hover?.i === i ? 'var(--primary-50)' : 'transparent'}
                    rx="10"
                  />
                  <text x="8" y={y + 4} fontSize="12" fill="var(--ink-900)" fontWeight="600">
                    {r.code}
                  </text>
                  <line
                    x1={pos(r.msePct!)}
                    x2={pos(r.seePct!)}
                    y1={y}
                    y2={y}
                    stroke={up ? 'var(--success-500)' : 'var(--danger-500)'}
                    strokeWidth="4"
                    strokeLinecap="round"
                    opacity="0.5"
                  />
                  <circle
                    cx={pos(r.msePct!)}
                    cy={y}
                    r="6"
                    fill="var(--surface)"
                    stroke="var(--primary-600)"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx={pos(r.seePct!)}
                    cy={y}
                    r="6.5"
                    fill="var(--success-500)"
                    stroke="var(--surface)"
                    strokeWidth="2"
                  />
                </g>
              )
            })}
            {[0, 50, 100].map((t) => (
              <text
                key={t}
                x={pos(t)}
                y={comparable.length * rowH + 20}
                fontSize="11"
                fill="var(--ink-500)"
                textAnchor="middle"
              >
                {t}%
              </text>
            ))}
          </svg>
          {hover && comparable[hover.i] && (
            <ChartTooltip x={hover.x} y={hover.y} visible>
              <p className="font-semibold">{comparable[hover.i]!.name}</p>
              <p className="num mt-0.5">
                MSE {comparable[hover.i]!.msePct!.toFixed(1)}% → SEE {comparable[hover.i]!.seePct!.toFixed(1)}
                %
              </p>
            </ChartTooltip>
          )}
          {skipped.length > 0 && (
            <p className="text-ink-500 mt-3 text-xs">
              Not compared ({skipped.length}): {skipped.map((s) => s.code).join(', ')}: maximum marks or one
              assessment missing.
            </p>
          )}
        </div>
      )}
    </ChartFrame>
  )
}

// ───────────────────────────── Subject heatmap (sequential blue) ─────────────────────────────
const SEQ = ['#EFF6FF', '#DBEAFE', '#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB']
const seqColor = (pct: number) =>
  SEQ[Math.min(SEQ.length - 1, Math.max(0, Math.floor(pct / (100 / SEQ.length))))]!

export type HeatmapRow = { code: string; name: string; cells: { label: string; pct: number | null }[] }

export function SubjectHeatmap({
  rows,
  columns,
  semesterLabel,
}: {
  rows: HeatmapRow[]
  columns: string[]
  semesterLabel: string
}) {
  const table: TableData = {
    caption: `Assessment percentages by subject, ${semesterLabel}`,
    columns: ['Subject', ...columns],
    rows: rows.map((r) => [
      `${r.code} · ${r.name}`,
      ...r.cells.map((c) => (c.pct == null ? 'n/a' : `${c.pct.toFixed(0)}%`)),
    ]),
  }
  return (
    <ChartFrame
      title="Subject strength map"
      description={`Percentage per assessment · ${semesterLabel}`}
      table={table}
    >
      {rows.length === 0 ? (
        <NotEnoughData reason="Add marks with maximum marks to see the strength map." />
      ) : (
        <div className="overflow-x-auto">
          <div
            className="grid min-w-[420px] gap-1.5"
            style={{ gridTemplateColumns: `minmax(96px,1.2fr) repeat(${columns.length}, minmax(56px,1fr))` }}
          >
            <div />
            {columns.map((c) => (
              <div key={c} className="eyebrow pb-1 text-center">
                {c}
              </div>
            ))}
            {rows.map((r) => (
              <React.Fragment key={r.code}>
                <div
                  className="text-ink-900 flex items-center truncate pr-2 text-sm font-semibold"
                  title={r.name}
                >
                  {r.code}
                </div>
                {r.cells.map((c, i) => (
                  <div
                    key={i}
                    title={`${r.name} · ${c.label}: ${c.pct == null ? 'not available' : `${c.pct.toFixed(1)}%`}`}
                    className={cn(
                      'num grid h-11 place-items-center rounded-[12px] text-xs font-semibold',
                      c.pct == null && 'border-line-strong text-ink-500 border border-dashed',
                    )}
                    style={
                      c.pct == null
                        ? undefined
                        : { background: seqColor(c.pct), color: c.pct >= 72 ? '#fff' : 'var(--ink-900)' }
                    }
                  >
                    {c.pct == null ? 'n/a' : `${Math.round(c.pct)}`}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
          <div className="text-ink-500 mt-4 flex items-center gap-2 text-[0.6875rem]">
            <span>0%</span>
            <div className="flex h-2 max-w-48 flex-1 overflow-hidden rounded-full">
              {SEQ.map((c) => (
                <span key={c} className="flex-1" style={{ background: c }} />
              ))}
            </div>
            <span>100%</span>
          </div>
        </div>
      )}
    </ChartFrame>
  )
}

// ───────────────────────────── Credit completion ─────────────────────────────
export function CreditProgress({
  earned,
  inProgress,
  required,
  className,
}: {
  earned: number
  inProgress: number
  required: number | null
  className?: string
}) {
  const total = required ?? Math.max(earned + inProgress, 1)
  const remaining = Math.max(0, total - earned - inProgress)
  const seg = (v: number) => `${(v / total) * 100}%`
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between">
        <p className="text-ink-700 text-sm">
          <span className="num-display text-ink-900 text-2xl font-semibold">{earned}</span>
          <span className="text-ink-500">{required ? ` / ${required} credits` : ' credits earned'}</span>
        </p>
        {required && (
          <p className="num text-ink-900 text-sm font-semibold">{Math.round((earned / required) * 100)}%</p>
        )}
      </div>
      <div
        className="bg-chart-track mt-3 flex h-3 w-full gap-[2px] overflow-hidden rounded-full"
        role="img"
        aria-label={`${earned} credits earned, ${inProgress} in progress${required ? `, ${remaining} remaining of ${required}` : ''}`}
      >
        <span className="bg-primary-600 h-full rounded-full" style={{ width: seg(earned) }} />
        {inProgress > 0 && (
          <span className="bg-primary-300 h-full rounded-full" style={{ width: seg(inProgress) }} />
        )}
      </div>
      <div className="text-ink-500 mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-primary-600 size-2 rounded-full" /> Earned{' '}
          <span className="num text-ink-900 font-semibold">{earned}</span>
        </span>
        {inProgress > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="bg-primary-300 size-2 rounded-full" /> In progress{' '}
            <span className="num text-ink-900 font-semibold">{inProgress}</span>
          </span>
        )}
        {required && (
          <span className="inline-flex items-center gap-1.5">
            <span className="bg-line-strong size-2 rounded-full" /> Remaining{' '}
            <span className="num text-ink-900 font-semibold">{remaining}</span>
          </span>
        )}
      </div>
    </div>
  )
}
