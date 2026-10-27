'use client'

import * as React from 'react'
import { BarChart3, Table2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Segmented } from '@/components/ui/navigation'
import { HelpTip } from '@/components/ui/help-tip'
import type { GlossaryTerm } from '@/lib/glossary'

export type TableData = { columns: string[]; rows: (string | number | null)[][]; caption: string }

/** Every chart ships with a "View as table" alternative. */
export function ChartFrame({
  title,
  description,
  table,
  children,
  action,
  help,
  className,
  bodyClassName,
}: {
  title: string
  help?: GlossaryTerm
  description?: React.ReactNode
  table: TableData
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  const [view, setView] = React.useState<'chart' | 'table'>('chart')
  return (
    <section className={cn('h-full min-w-0 rounded-[24px] bg-surface shadow-2', className)} aria-label={title}>
      <header className="flex flex-wrap items-start justify-between gap-3 p-5 pb-0 sm:p-6 sm:pb-0">
        <div className="min-w-0">
          <h2 className="text-ink-900 flex items-center gap-1 text-lg font-semibold">
            {title}
            {help && <HelpTip term={help} />}
          </h2>
          {description && <p className="text-ink-500 mt-0.5 text-sm">{description}</p>}
        </div>
        <div className="flex max-w-full flex-wrap items-center gap-2">
          {action}
          <Segmented
            size="sm"
            label={`${title} view`}
            value={view}
            onChange={setView}
            options={[
              { value: 'chart', label: 'Chart', icon: BarChart3 },
              { value: 'table', label: 'Table', icon: Table2 },
            ]}
          />
        </div>
      </header>
      <div className={cn('p-5 sm:p-6', bodyClassName)}>
        {view === 'chart' ? children : <DataTableView data={table} />}
      </div>
    </section>
  )
}

export function DataTableView({ data }: { data: TableData }) {
  return (
    <div className="border-line overflow-x-auto rounded-[16px] border">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{data.caption}</caption>
        <thead className="bg-surface-muted text-ink-500 text-[0.6875rem] tracking-[0.04em] uppercase">
          <tr>
            {data.columns.map((c) => (
              <th key={c} scope="col" className="px-3 py-2.5 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i} className="border-line border-t">
              {r.map((v, j) => (
                <td
                  key={j}
                  className={cn('px-3 py-2.5', typeof v === 'number' ? 'num text-ink-900' : 'text-ink-700')}
                >
                  {v ?? '—'}
                </td>
              ))}
            </tr>
          ))}
          {data.rows.length === 0 && (
            <tr>
              <td colSpan={data.columns.length} className="text-ink-500 px-3 py-6 text-center">
                No data yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/** Shared tooltip chrome for SVG charts. */
export function ChartTooltip({
  x,
  y,
  children,
  visible,
}: {
  x: number
  y: number
  children: React.ReactNode
  visible: boolean
}) {
  if (!visible) return null
  return (
    <div
      role="status"
      className="bg-ink-900 shadow-3 pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-xl px-3 py-2 text-xs whitespace-nowrap text-white"
      style={{ left: x, top: y }}
    >
      {children}
    </div>
  )
}
