import * as React from 'react'
import { cn } from '@/lib/utils'

const STROKE: Record<string, string> = {
  brand: 'var(--chart-1)',
  accent: 'var(--chart-2)',
  success: 'var(--chart-3)',
  info: 'var(--chart-4)',
  danger: 'var(--danger-600)',
  warning: 'var(--chart-6)',
}

/** Tiny trend line for rows and cards. Pure SVG (works in server and client trees). */
export function Sparkline({
  data,
  tone = 'brand',
  className,
  label,
  min,
  max,
}: {
  data: number[]
  tone?: keyof typeof STROKE
  className?: string
  label: string
  min?: number
  max?: number
}) {
  const id = React.useId().replace(/:/g, '')
  if (data.length < 2) return null
  const w = 100
  const h = 32
  const lo = min ?? Math.min(...data)
  const hi = max ?? Math.max(...data)
  const span = hi - lo || 1
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 3 - ((v - lo) / span) * (h - 6)] as const)
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')
  const color = STROKE[tone]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn('overflow-visible', className)} role="img" aria-label={`${label}: ${data.join(', ')}`}>
      <defs>
        <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w} ${h} L0 ${h}Z`} fill={`url(#sp-${id})`} />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        className="animate-[draw_900ms_var(--ease-out)_both] motion-reduce:animate-none lowbw:animate-none"
      />
    </svg>
  )
}
