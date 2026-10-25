'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Medal } from 'lucide-react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { Segmented } from '@/components/ui/navigation'
import { NotEnoughData } from '@/components/ui/states'
import { progressTone } from '@/components/ui/primitives'
import { ChartFrame, type TableData } from './chart-frame'

// ───────────────────────────── Stacked rounded bars (ref-cognify) ─────────────────────────────
export type StackSeries = { key: string; label: string; color: string }
export type StackRow = { label: string; values: Record<string, number | null>; href?: string; sub?: string }

/** Grouped/stacked rounded bars on a light track column. `max` is the track height (e.g. 100 for %). */
export function StackedRoundedBarChart({
  title,
  description,
  series,
  rows,
  max = 100,
  unit = '%',
  mode = 'grouped',
  decimals = 1,
  action,
  empty = 'Not enough data yet.',
}: {
  title: string
  description?: string
  series: StackSeries[]
  rows: StackRow[]
  max?: number
  unit?: string
  mode?: 'grouped' | 'stacked'
  decimals?: number
  action?: React.ReactNode
  empty?: string
}) {
  const router = useRouter()
  const [hover, setHover] = React.useState<number | null>(null)
  const table: TableData = {
    caption: title,
    columns: ['Item', ...series.map((s) => s.label)],
    rows: rows.map((r) => [
      r.label,
      ...series.map((s) =>
        r.values[s.key] == null ? 'n/a' : `${Number(r.values[s.key]).toFixed(decimals)}${unit}`,
      ),
    ]),
  }
  const legend = (
    <div className="text-ink-700 flex flex-wrap items-center gap-3 text-xs">
      {series.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: s.color }} /> {s.label}
        </span>
      ))}
    </div>
  )
  return (
    <ChartFrame title={title} description={description} table={table} action={action}>
      {rows.length === 0 ? (
        <NotEnoughData reason={empty} />
      ) : (
        <div>
          <div className="mb-4">{legend}</div>
          <div className="relative">
            {[0, 25, 50, 75, 100].map((t) => (
              <div
                key={t}
                className="border-chart-grid pointer-events-none absolute right-0 left-8 border-t border-dashed"
                style={{ bottom: `${(t / 100) * 220 + 28}px` }}
              >
                <span className="num text-ink-500 absolute -top-2 -left-8 w-7 text-right text-[0.6875rem]">
                  {Number(((t / 100) * max).toFixed(1))}
                </span>
              </div>
            ))}
            <div
              className="relative ml-8 flex scrollbar-none items-end gap-3 overflow-x-auto pb-1"
              style={{ height: 248 }}
            >
              {rows.map((r, i) => {
                const vals = series.map((s) => ({ s, v: r.values[s.key] }))
                const cell = (
                  <div className="bg-chart-track flex h-[220px] w-full max-w-24 items-end justify-center gap-1 rounded-[14px] px-1.5 pb-1.5">
                    {mode === 'grouped' ? (
                      vals.map(({ s, v }) => (
                        <motion.span
                          key={s.key}
                          initial={{ height: 0 }}
                          whileInView={{ height: v == null ? 0 : `${Math.min(100, (v / max) * 100)}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, delay: i * 0.03 }}
                          className="max-w-8 min-w-2.5 flex-1 rounded-[10px]"
                          style={{ background: s.color }}
                        />
                      ))
                    ) : (
                      <div className="flex h-full w-5 flex-col-reverse gap-[2px]">
                        {vals.map(({ s, v }) => (
                          <motion.span
                            key={s.key}
                            initial={{ height: 0 }}
                            whileInView={{ height: v == null ? 0 : `${(v / max) * 100}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="w-full rounded-[10px]"
                            style={{ background: s.color }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
                return (
                  <div
                    key={r.label}
                    className="relative flex flex-1 flex-col items-center gap-2"
                    style={{ minWidth: mode === 'grouped' ? series.length * 16 + 16 : 34 }}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  >
                    {r.href ? (
                      <button
                        type="button"
                        className="flex w-full justify-center rounded-[12px] outline-offset-2"
                        aria-label={`${r.label}: ${vals.map(({ s, v }) => `${s.label} ${v == null ? 'n/a' : v.toFixed(decimals) + unit}`).join(', ')}. Open list.`}
                        onClick={() => router.push(r.href!)}
                      >
                        {cell}
                      </button>
                    ) : (
                      cell
                    )}
                    <span
                      className="text-ink-500 max-w-16 truncate text-[0.6875rem] font-semibold"
                      title={r.sub ?? r.label}
                    >
                      {r.label}
                    </span>
                    {hover === i && (
                      <div
                        role="status"
                        className="bg-ink-900 shadow-3 pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 -translate-y-full rounded-xl px-3 py-2 text-xs whitespace-nowrap text-white"
                      >
                        <p className="font-semibold">{r.sub ?? r.label}</p>
                        {vals.map(({ s, v }) => (
                          <p key={s.key} className="num mt-0.5 flex items-center gap-1.5">
                            <span className="size-2 rounded-full" style={{ background: s.color }} /> {s.label}
                            : {v == null ? 'n/a' : `${v.toFixed(decimals)}${unit}`}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </ChartFrame>
  )
}

// ───────────────────────────── Donut with center total (ref-cognify) ─────────────────────────────
export type DonutSlice = { key: string; label: string; value: number; color: string; href?: string }

export function DonutWithTotal({
  title,
  description,
  views,
  totalLabel = 'Total',
}: {
  title: string
  description?: string
  views: { key: string; label: string; slices: DonutSlice[] }[]
  totalLabel?: string
}) {
  const router = useRouter()
  const [view, setView] = React.useState(views[0]?.key ?? '')
  const slices = views.find((v) => v.key === view)?.slices ?? []
  const total = slices.reduce((a, s) => a + s.value, 0)
  const r = 62
  const c = 2 * Math.PI * r
  const offsets = slices.map((_, i) => slices.slice(0, i).reduce((a, x) => a + (x.value / total) * c, 0))
  const table: TableData = {
    caption: title,
    columns: ['Item', 'Value', '%'],
    rows: slices.map((s) => [s.label, s.value, total ? `${Math.round((s.value / total) * 100)}%` : '—']),
  }
  return (
    <ChartFrame
      title={title}
      description={description}
      table={table}
      action={
        views.length > 1 ? (
          <Segmented
            size="sm"
            label={`${title} range`}
            value={view}
            onChange={setView}
            options={views.map((v) => ({ value: v.key, label: v.label }))}
          />
        ) : undefined
      }
    >
      {total === 0 ? (
        <NotEnoughData reason="Nothing to show yet." />
      ) : (
        <div className="@container">
          <div className="flex flex-col items-center gap-6 @md:flex-row">
            <div className="relative size-44 shrink-0">
              <svg
                viewBox="0 0 160 160"
                className="size-44 -rotate-90"
                role="img"
                aria-label={`${title}: ${slices.map((s) => `${s.label} ${s.value}`).join(', ')}`}
              >
                <circle cx="80" cy="80" r={r} fill="none" stroke="var(--chart-track)" strokeWidth="20" />
                {slices.map((s, i) => {
                  const len = (s.value / total) * c
                  const gap = slices.length > 1 ? 3 : 0
                  return (
                    <motion.circle
                      key={s.key}
                      cx="80"
                      cy="80"
                      r={r}
                      fill="none"
                      stroke={s.color}
                      strokeWidth="20"
                      strokeLinecap="round"
                      strokeDasharray={`${Math.max(0, len - gap)} ${c}`}
                      initial={{ strokeDashoffset: c }}
                      animate={{ strokeDashoffset: -offsets[i]! }}
                      transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                      className={s.href ? 'cursor-pointer' : undefined}
                      onClick={s.href ? () => router.push(s.href!) : undefined}
                    />
                  )
                })}
              </svg>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <p className="num-display text-ink-900 text-4xl font-semibold">{total}</p>
                  <p className="text-ink-500 text-xs">{totalLabel}</p>
                </div>
              </div>
            </div>
            <ul className="w-full space-y-2.5">
              {slices.map((s) => {
                const inner = (
                  <>
                    <span className="text-ink-700 inline-flex items-center gap-2 text-sm whitespace-nowrap">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />{' '}
                      {s.label}
                    </span>
                    <span className="num text-ink-900 text-sm whitespace-nowrap">
                      <span className="font-semibold">{s.value}</span>{' '}
                      <span className="text-ink-500">· {Math.round((s.value / total) * 100)}%</span>
                    </span>
                  </>
                )
                return (
                  <li key={s.key}>
                    {s.href ? (
                      <Link
                        href={s.href}
                        className="hover:bg-surface-muted flex items-center justify-between gap-3 rounded-[12px] px-2 py-1"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div className="flex items-center justify-between gap-3 px-2 py-1">{inner}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </ChartFrame>
  )
}

// ───────────────────────────── Progress table (ref-cognify "Recent Results") ─────────────────────────────
export type ProgressColumn<T> = {
  key: string
  header: string
  className?: string
  render: (row: T) => React.ReactNode
  mobile?: boolean
}

export function ProgressTable<T extends { id: string }>({
  title,
  description,
  columns,
  rows,
  href,
  seeMore,
  empty,
}: {
  title: string
  description?: string
  columns: ProgressColumn<T>[]
  rows: T[]
  href?: (row: T) => string
  seeMore?: string
  empty: React.ReactNode
}) {
  return (
    <section className="bg-surface shadow-2 h-full rounded-[24px]" aria-label={title}>
      <header className="flex items-start justify-between gap-3 p-5 pb-3 sm:p-6 sm:pb-3">
        <div>
          <h2 className="text-ink-900 text-lg font-semibold">{title}</h2>
          {description && <p className="text-ink-500 mt-0.5 text-sm">{description}</p>}
        </div>
        {seeMore && (
          <Link
            href={seeMore}
            className="border-line text-ink-900 hover:border-primary-300 hover:text-primary-700 inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-sm font-semibold"
          >
            See More
          </Link>
        )}
      </header>
      {rows.length === 0 ? (
        <div className="px-5 pb-6">{empty}</div>
      ) : (
        <>
          <div className="hidden overflow-x-auto px-3 pb-3 md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">{title}</caption>
              <thead>
                <tr className="text-left">
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      className={cn(
                        'bg-surface-muted text-ink-500 px-3 py-2.5 text-[0.6875rem] font-semibold tracking-[0.04em] uppercase first:rounded-l-[12px] last:rounded-r-[12px]',
                        c.className,
                      )}
                    >
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="group relative">
                    {columns.map((c, i) => (
                      <td
                        key={c.key}
                        className={cn(
                          'group-hover:bg-surface-muted px-3 py-3.5 align-middle',
                          i === 0 && 'rounded-l-[14px]',
                          i === columns.length - 1 && 'rounded-r-[14px]',
                          c.className,
                        )}
                      >
                        {i === 0 && href ? (
                          <Link
                            href={href(r)}
                            className="focus-visible:after:ring-primary-600 outline-none after:absolute after:inset-0 after:rounded-[14px] focus-visible:after:ring-2"
                          >
                            {c.render(r)}
                          </Link>
                        ) : (
                          c.render(r)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-2 px-4 pb-4 md:hidden">
            {rows.map((r) => (
              <li key={r.id} className="bg-surface-muted relative rounded-[16px] p-4">
                {href && (
                  <Link href={href(r)} aria-label="Open" className="absolute inset-0 rounded-[16px]" />
                )}
                <div className="space-y-2">
                  {columns
                    .filter((c) => c.mobile !== false)
                    .map((c, i) => (
                      <div
                        key={c.key}
                        className={cn(i === 0 ? '' : 'flex items-center justify-between gap-3')}
                      >
                        {i > 0 && (
                          <span className="text-ink-500 text-[0.6875rem] font-semibold tracking-[0.04em] uppercase">
                            {c.header}
                          </span>
                        )}
                        <div className={cn(i > 0 && 'min-w-0 text-right')}>{c.render(r)}</div>
                      </div>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

/** Colored % bar cell — the number is always visible next to the bar. */
export function PercentBar({ value, label }: { value: number | null; label: string }) {
  if (value == null) return <span className="text-ink-500 text-xs">n/a</span>
  const tone = progressTone(value)
  const fill = { success: 'bg-success-500', warning: 'bg-warning-500', danger: 'bg-danger-500' }[tone]
  return (
    <div className="flex min-w-32 items-center gap-2.5">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="bg-chart-track h-2 flex-1 overflow-hidden rounded-full"
      >
        <div
          className={cn('h-full rounded-full', fill)}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="num text-ink-900 w-10 text-right text-xs font-semibold">{Math.round(value)}%</span>
    </div>
  )
}

// ───────────────────────────── Rank list (ref-cognify) ─────────────────────────────
export type RankItem = {
  id: string
  name: string
  sub?: string
  value: string
  change?: number | null
  href?: string
  hasAvatar?: boolean
  avatar?: boolean
}

export function RankList({
  title,
  description,
  items,
  empty,
  seeMore,
}: {
  title: string
  description?: string
  items: RankItem[]
  empty: React.ReactNode
  seeMore?: string
}) {
  const medal = ['text-warning-500', 'text-ink-400', 'text-accent-700']
  return (
    <section className="bg-surface shadow-2 rounded-[24px]" aria-label={title}>
      <header className="flex items-start justify-between gap-3 p-5 pb-2 sm:p-6 sm:pb-2">
        <div>
          <h2 className="text-ink-900 text-lg font-semibold">{title}</h2>
          {description && <p className="text-ink-500 mt-0.5 text-sm">{description}</p>}
        </div>
        {seeMore && (
          <Link
            href={seeMore}
            className="border-line text-ink-900 hover:border-primary-300 hover:text-primary-700 inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-sm font-semibold"
          >
            See More
          </Link>
        )}
      </header>
      {items.length === 0 ? (
        <div className="px-5 pb-6">{empty}</div>
      ) : (
        <>
          <div
            aria-hidden
            className="bg-surface-muted text-ink-500 mx-3 mb-1 flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[0.6875rem] font-semibold tracking-[0.04em] uppercase"
          >
            <span className="w-7 text-center">#</span>
            <span className="flex-1">Name</span>
            <span>{items.some((it) => it.change != null) ? 'Value · change' : 'Value'}</span>
          </div>
          <ol className="px-3 pb-3">
            {items.map((it, i) => (
              <li
                key={it.id}
                className="hover:bg-surface-muted relative flex items-center gap-3 rounded-[14px] px-3 py-2.5"
              >
                <span className="grid w-7 shrink-0 place-items-center">
                  {i < 3 ? (
                    <Medal className={cn('size-5', medal[i])} aria-label={`Rank ${i + 1}`} />
                  ) : (
                    <span className="num text-ink-500 text-sm font-semibold">{i + 1}</span>
                  )}
                </span>
                {it.avatar !== false && (
                  <Avatar userId={it.id} name={it.name} hasImage={it.hasAvatar} size="sm" />
                )}
                <div className="min-w-0 flex-1">
                  {it.href ? (
                    <Link
                      href={it.href}
                      className="text-ink-900 block truncate text-sm font-semibold after:absolute after:inset-0"
                    >
                      {it.name}
                    </Link>
                  ) : (
                    <p className="text-ink-900 truncate text-sm font-semibold">{it.name}</p>
                  )}
                  {it.sub && <p className="text-ink-500 truncate text-xs">{it.sub}</p>}
                </div>
                <span className="num text-ink-900 text-sm font-semibold">{it.value}</span>
                {it.change != null && (
                  <span
                    className={cn(
                      'num inline-flex h-6 items-center gap-0.5 rounded-full px-2 text-xs font-semibold',
                      it.change >= 0 ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700',
                    )}
                  >
                    {it.change >= 0 ? (
                      <ArrowUp className="size-3" aria-label="up" />
                    ) : (
                      <ArrowDown className="size-3" aria-label="down" />
                    )}
                    {Math.abs(it.change).toFixed(2)}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  )
}

// ───────────────────────────── Mini calendar + schedule (ref-kouliah) ─────────────────────────────
export function MiniCalendar({
  marked,
  selected,
  onSelect,
}: {
  marked: string[]
  selected?: Date
  onSelect?: (d: Date) => void
}) {
  const [month, setMonth] = React.useState(() => startOfMonth(selected ?? new Date()))
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  })
  const markedSet = new Set(marked.map((d) => d.slice(0, 10)))
  return (
    <div className="bg-surface shadow-2 rounded-[24px] p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-ink-900 font-semibold">{format(month, 'MMMM yyyy')}</p>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setMonth(subMonths(month, 1))}
            className="text-ink-500 hover:bg-surface-muted grid size-8 place-items-center rounded-full"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setMonth(addMonths(month, 1))}
            className="text-ink-500 hover:bg-surface-muted grid size-8 place-items-center rounded-full"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div className="text-ink-500 grid grid-cols-7 gap-1 text-center text-[0.6875rem] font-semibold">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((d) => {
          const key = format(d, 'yyyy-MM-dd')
          const sel = selected && isSameDay(d, selected)
          const today = isSameDay(d, new Date())
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect?.(d)}
              aria-label={`${format(d, 'd MMMM')}${markedSet.has(key) ? ', has events' : ''}`}
              className={cn(
                'num relative grid h-9 place-items-center rounded-[12px] text-xs font-semibold transition-colors',
                !isSameMonth(d, month) && 'text-ink-400',
                isSameMonth(d, month) && !sel && 'text-ink-700 hover:bg-surface-muted',
                today && !sel && 'ring-primary-300 ring-1',
                sel && 'bg-primary-600 shadow-glow text-white',
              )}
            >
              {format(d, 'd')}
              {markedSet.has(key) && (
                <span
                  className={cn('absolute bottom-1 size-1 rounded-full', sel ? 'bg-white' : 'bg-primary-600')}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export type ScheduleItem = {
  id: string
  date: string
  title: string
  sub?: string
  href?: string
  kind: 'session' | 'goal'
}

export function ScheduleCards({ items, empty }: { items: ScheduleItem[]; empty: React.ReactNode }) {
  if (!items.length) return <>{empty}</>
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => {
        const d = new Date(it.date)
        const first = i === 0
        const inner = (
          <div
            className={cn(
              'flex items-center gap-3 rounded-[20px] p-3',
              first ? 'bg-primary-600 shadow-glow text-white' : 'bg-surface shadow-2',
            )}
          >
            <div
              className={cn(
                'grid w-14 shrink-0 place-items-center rounded-[14px] py-2 text-center',
                first ? 'bg-white/15' : 'bg-primary-50',
              )}
            >
              <span
                className={cn(
                  'num-display text-2xl leading-none font-semibold',
                  first ? 'text-white' : 'text-ink-900',
                )}
              >
                {format(d, 'd')}
              </span>
              <span
                className={cn(
                  'text-[0.6875rem] font-semibold uppercase',
                  first ? 'text-white/90' : 'text-primary-700',
                )}
              >
                {format(d, 'MMM')}
              </span>
            </div>
            <div className="min-w-0">
              <p className={cn('truncate text-sm font-semibold', first ? 'text-white' : 'text-ink-900')}>
                {it.title}
              </p>
              <p className={cn('truncate text-xs', first ? 'text-white/90' : 'text-ink-500')}>
                {it.kind === 'session' ? format(d, 'EEE, h:mm a') : `Due ${format(d, 'EEE d MMM')}`}
                {it.sub ? ` · ${it.sub}` : ''}
              </p>
            </div>
          </div>
        )
        return (
          <li key={`${it.kind}-${it.id}`}>
            {it.href ? (
              <Link href={it.href} className="block rounded-[20px] outline-offset-2">
                {inner}
              </Link>
            ) : (
              inner
            )}
          </li>
        )
      })}
    </ul>
  )
}
