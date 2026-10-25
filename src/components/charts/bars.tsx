'use client'

import * as React from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { NotEnoughData } from '@/components/ui/states'
import { ChartFrame } from './chart-frame'

type Bar = { label: string; value: number; display?: string; tone?: 'brand' | 'danger' | 'warning' | 'success' | 'accent'; href?: string }

const FILL = { brand: 'bg-gradient-primary', danger: 'bg-danger-500', warning: 'bg-warning-500', success: 'bg-success-500', accent: 'bg-accent-500' }

/** Horizontal labelled bars (direct labels; table alternative via ChartFrame). */
export function BarList({ title, description, bars, max, unit = '', empty }: { title: string; description?: string; bars: Bar[]; max?: number; unit?: string; empty: string }) {
  const top = max ?? Math.max(1, ...bars.map((b) => b.value))
  return (
    <ChartFrame title={title} description={description} table={{ caption: title, columns: ['Item', 'Value'], rows: bars.map((b) => [b.label, b.display ?? `${b.value}${unit}`]) }}>
      {bars.length === 0 ? (
        <NotEnoughData reason={empty} />
      ) : (
        <ul className="space-y-3">
          {bars.map((b, i) => (
            <li key={b.label}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-ink-900">{b.label}</span>
                <span className="num shrink-0 text-xs text-ink-700">{b.display ?? `${b.value}${unit}`}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
                <motion.div
                  className={cn('h-full rounded-full', FILL[b.tone ?? 'brand'])}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(b.value / top) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.04 }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </ChartFrame>
  )
}

/** Vertical histogram with hover values. */
export function Histogram({ title, description, bins, empty }: { title: string; description?: string; bins: { label: string; value: number }[]; empty: string }) {
  const top = Math.max(1, ...bins.map((b) => b.value))
  const total = bins.reduce((n, b) => n + b.value, 0)
  return (
    <ChartFrame title={title} description={description} table={{ caption: title, columns: ['Range', 'Students'], rows: bins.map((b) => [b.label, b.value]) }}>
      {total === 0 ? (
        <NotEnoughData reason={empty} />
      ) : (
        <div className="flex h-56 items-end gap-2 sm:gap-3" role="img" aria-label={`${title}: ${bins.map((b) => `${b.label}: ${b.value}`).join(', ')}`}>
          {bins.map((b, i) => (
            <div key={b.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
              <span className="num text-xs font-semibold text-ink-900 opacity-80 group-hover:opacity-100">{b.value || ''}</span>
              <motion.div
                className="w-full rounded-t-md rounded-b-[3px] bg-gradient-to-t from-primary-600 to-[#60A5FA] group-hover:from-primary-700"
                initial={{ height: 0 }}
                whileInView={{ height: `${(b.value / top) * 82}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                style={{ minHeight: b.value ? 4 : 0 }}
              />
              <span className="num text-[0.6875rem] text-ink-500">{b.label}</span>
            </div>
          ))}
        </div>
      )}
    </ChartFrame>
  )
}
