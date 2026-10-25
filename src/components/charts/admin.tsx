'use client'

import * as React from 'react'
import Link from 'next/link'
import { Minus, Network, Plus, List, RotateCcw } from 'lucide-react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { cn } from '@/lib/utils'
import { useElementWidth } from '@/lib/hooks'
import { useLowBandwidth } from '@/components/providers'
import { Segmented } from '@/components/ui/navigation'
import { NotEnoughData } from '@/components/ui/states'
import { ChartFrame, type TableData } from './chart-frame'

// ───────────────────────────── Department trend ─────────────────────────────
export function DepartmentTrend({ data, series }: { data: Record<string, number | string | null>[]; series: string[] }) {
  const { lowBandwidth } = useLowBandwidth()
  const colors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)']
  const table: TableData = {
    caption: 'Average SGPA by semester and section',
    columns: ['Semester', ...series],
    rows: data.map((d) => [String(d.name), ...series.map((s) => (d[s] == null ? null : Number(d[s]).toFixed(2)))]),
  }
  return (
    <ChartFrame title="Department SGPA trend" description="Average verified SGPA by semester, per section" table={table}>
      {data.length < 2 ? (
        <NotEnoughData reason="Trends appear once two or more semesters have verified SGPA." />
      ) : (
        <div className="h-64 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 6" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-500)', fontSize: 12 }} dy={8} />
              <YAxis domain={[0, 10]} tickLine={false} axisLine={false} width={32} tick={{ fill: 'var(--ink-500)', fontSize: 12 }} />
              <Tooltip
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="rounded-xl bg-ink-900 px-3 py-2 text-xs text-white shadow-3">
                      <p className="font-semibold">{label}</p>
                      {payload.map((p) => (
                        <p key={String(p.dataKey)} className="num mt-0.5 flex items-center gap-1.5">
                          <span className="size-2 rounded-full" style={{ background: p.color }} />
                          {String(p.dataKey)}: {Number(p.value).toFixed(2)}
                        </p>
                      ))}
                    </div>
                  ) : null
                }
              />
              {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--ink-700)' }} />}
              {series.map((s, i) => (
                <Line
                  key={s}
                  type="monotone"
                  dataKey={s}
                  stroke={colors[i % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, fill: 'var(--surface)' }}
                  connectNulls
                  isAnimationActive={!lowBandwidth}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartFrame>
  )
}

// ───────────────────────────── Mentoring Constellation ─────────────────────────────
export type ConstellationMentor = {
  id: string
  name: string
  mentees: { id: string; name: string; risk: 'none' | 'medium' | 'high' }[]
}

const RISK_FILL = { none: 'var(--chart-4)', medium: 'var(--warning-500)', high: 'var(--danger-500)' }

export function MentoringConstellation({ hodName, mentors, unassigned }: { hodName: string; mentors: ConstellationMentor[]; unassigned: number }) {
  const [view, setView] = React.useState<'graph' | 'list'>('graph')
  const [zoom, setZoom] = React.useState(1)
  const [pan, setPan] = React.useState({ x: 0, y: 0 })
  const [focus, setFocus] = React.useState<string | null>(null)
  const drag = React.useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const [ref, width] = useElementWidth<HTMLDivElement>(720)
  const height = width < 500 ? 380 : 460
  const cx = width / 2
  const cy = height / 2
  const R = Math.min(width, height) * 0.32
  const totalMentees = mentors.reduce((n, m) => n + m.mentees.length, 0)

  const nodes = mentors.map((m, i) => {
    const a = (i / Math.max(1, mentors.length)) * Math.PI * 2 - Math.PI / 2
    const mx = cx + R * Math.cos(a)
    const my = cy + R * Math.sin(a)
    const ringR = 22 + Math.min(34, m.mentees.length * 2.2)
    const mentees = m.mentees.map((s, j) => {
      const b = a + ((j - (m.mentees.length - 1) / 2) / Math.max(1, m.mentees.length)) * Math.PI * 1.6
      return { ...s, x: mx + ringR * Math.cos(b), y: my + ringR * Math.sin(b) }
    })
    return { ...m, x: mx, y: my, mentees }
  })

  return (
    <section className="overflow-hidden rounded-[24px] bg-surface shadow-2" aria-label="Mentoring constellation">
      <header className="flex flex-wrap items-start justify-between gap-3 p-5 pb-0 sm:p-6 sm:pb-0">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Mentoring constellation</h2>
          <p className="mt-0.5 text-sm text-ink-500">
            {mentors.length} mentors · {totalMentees} mentees{unassigned ? ` · ${unassigned} unassigned` : ''}
          </p>
        </div>
        <Segmented
          size="sm"
          label="Constellation view"
          value={view}
          onChange={setView}
          options={[
            { value: 'graph', label: 'Graph', icon: Network },
            { value: 'list', label: 'List', icon: List },
          ]}
        />
      </header>
      {view === 'list' ? (
        <div className="p-5 sm:p-6">
          <ul className="divide-y divide-line">
            {mentors.map((m) => (
              <li key={m.id} className="py-3">
                <Link href={`/hod/mentors/${m.id}`} className="font-medium text-ink-900 hover:text-primary-700">
                  {m.name}
                </Link>
                <span className="num ml-2 text-xs text-ink-500">{m.mentees.length} mentees</span>
                {m.mentees.length > 0 && (
                  <p className="mt-1 text-sm text-ink-500">
                    {m.mentees.map((s, i) => (
                      <React.Fragment key={s.id}>
                        {i > 0 && ', '}
                        <Link href={`/hod/students/${s.id}`} className={cn('hover:text-primary-700 hover:underline', s.risk !== 'none' && 'font-medium text-danger-700')}>
                          {s.name}
                          {s.risk !== 'none' && ' (flagged)'}
                        </Link>
                      </React.Fragment>
                    ))}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div ref={ref} className="relative mt-2">
          <div className="absolute top-3 right-4 z-10 flex flex-col gap-1.5">
            {[
              { icon: Plus, label: 'Zoom in', on: () => setZoom((z) => Math.min(2.5, z + 0.25)) },
              { icon: Minus, label: 'Zoom out', on: () => setZoom((z) => Math.max(0.6, z - 0.25)) },
              { icon: RotateCcw, label: 'Reset view', on: () => { setZoom(1); setPan({ x: 0, y: 0 }) } },
            ].map((b) => (
              <button key={b.label} type="button" onClick={b.on} aria-label={b.label} className="grid size-9 place-items-center rounded-full bg-surface text-ink-700 shadow-2 hover:text-primary-700">
                <b.icon className="size-4" />
              </button>
            ))}
          </div>
          <div className="absolute bottom-3 left-4 z-10 flex flex-wrap gap-3 rounded-full bg-surface px-3 py-1.5 text-[0.6875rem] text-ink-700 shadow-1">
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: RISK_FILL.none }} />On track</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: RISK_FILL.medium }} />Watch</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: RISK_FILL.high }} />Needs attention</span>
          </div>
          <svg
            width={width}
            height={height}
            className="cursor-grab touch-none active:cursor-grabbing"
            role="group"
            aria-label="Mentoring hierarchy graph. Use Tab to move between mentors."
            onPointerDown={(e) => {
              drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
            }}
            onPointerMove={(e) => {
              if (!drag.current) return
              setPan({ x: drag.current.px + e.clientX - drag.current.x, y: drag.current.py + e.clientY - drag.current.y })
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerLeave={() => (drag.current = null)}
            onWheel={(e) => {
              if (!e.ctrlKey && !e.metaKey) return
              setZoom((z) => Math.min(2.5, Math.max(0.6, z - e.deltaY * 0.002)))
            }}
          >
            <defs>
              <radialGradient id="hodcore" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor="var(--primary-500)" />
                <stop offset="100%" stopColor="var(--primary-600)" />
              </radialGradient>
            </defs>
            <g transform={`translate(${pan.x + cx * (1 - zoom)} ${pan.y + cy * (1 - zoom)}) scale(${zoom})`}>
              <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--line)" strokeDasharray="2 6" />
              {nodes.map((m) => (
                <line key={`l-${m.id}`} x1={cx} y1={cy} x2={m.x} y2={m.y} stroke={focus === m.id ? 'var(--primary-500)' : 'var(--line-strong)'} strokeWidth={focus === m.id ? 2 : 1} />
              ))}
              {nodes.map((m) =>
                m.mentees.map((s) => (
                  <line key={`ls-${s.id}`} x1={m.x} y1={m.y} x2={s.x} y2={s.y} stroke="var(--line)" strokeWidth="1" opacity={focus && focus !== m.id ? 0.3 : 1} />
                )),
              )}
              <circle cx={cx} cy={cy} r="30" fill="url(#hodcore)" />
              <circle cx={cx} cy={cy} r="38" fill="none" stroke="var(--primary-100)" strokeWidth="6" />
              <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--surface)">HOD</text>
              <text x={cx} y={cy + 56} textAnchor="middle" fontSize="11" fill="var(--ink-500)">{hodName}</text>
              {nodes.map((m) => (
                <g key={m.id} opacity={focus && focus !== m.id ? 0.45 : 1} className="transition-opacity">
                  {m.mentees.map((s) => (
                    <a key={s.id} href={`/hod/students/${s.id}`} aria-label={`${s.name}${s.risk !== 'none' ? ', flagged for attention' : ''}`}>
                      <circle cx={s.x} cy={s.y} r={s.risk === 'none' ? 5 : 6.5} fill={RISK_FILL[s.risk]} stroke="var(--surface)" strokeWidth="2">
                        <title>{s.name}</title>
                      </circle>
                      {s.risk === 'high' && <circle cx={s.x} cy={s.y} r="10" fill="none" stroke="var(--danger-500)" strokeOpacity="0.4" />}
                    </a>
                  ))}
                  <a
                    href={`/hod/mentors/${m.id}`}
                    aria-label={`${m.name}, ${m.mentees.length} mentees`}
                    onFocus={() => setFocus(m.id)}
                    onBlur={() => setFocus(null)}
                    onMouseEnter={() => setFocus(m.id)}
                    onMouseLeave={() => setFocus(null)}
                  >
                    <circle cx={m.x} cy={m.y} r="16" fill="var(--surface)" stroke={focus === m.id ? 'var(--primary-600)' : 'var(--line-strong)'} strokeWidth="2" />
                    <text x={m.x} y={m.y + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--ink-900)">
                      {m.mentees.length}
                    </text>
                    <text x={m.x} y={m.y + (m.y > cy ? 34 : -24)} textAnchor="middle" fontSize="11" fontWeight="500" fill="var(--ink-700)">
                      {m.name.length > 18 ? `${m.name.slice(0, 17)}…` : m.name}
                    </text>
                  </a>
                </g>
              ))}
            </g>
          </svg>
          {mentors.length === 0 && (
            <div className="absolute inset-0 grid place-items-center">
              <NotEnoughData reason="No mentors yet. Invite mentors from User management." className="max-w-sm bg-surface" />
            </div>
          )}
        </div>
      )}
    </section>
  )
}
