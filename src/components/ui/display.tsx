'use client'

import * as React from 'react'
import Link from 'next/link'
import { animate, useInView, useReducedMotion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLowBandwidth } from '@/components/providers'
import { Sparkline } from '@/components/charts/sparkline'
import {
  Icon3D,
  Icon3DBadge,
  Scene,
  type Icon3DName,
  type SceneName,
} from '@/components/illustrations/icons3d'
import type { GlossaryTerm } from '@/lib/glossary'
import { DeltaChip } from './primitives'
import { HelpTip } from './help-tip'

/** Animated count-up, once, on first view. Static under reduced motion / low bandwidth. */
export function CountUp({
  value,
  decimals = 0,
  className,
}: {
  value: number
  decimals?: number
  className?: string
}) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const { lowBandwidth } = useLowBandwidth()
  const still = !!reduce || lowBandwidth
  const [shown, setShown] = React.useState(0)
  React.useEffect(() => {
    if (!inView || still) return
    const c = animate(0, value, { duration: 0.9, ease: [0.2, 0.8, 0.2, 1], onUpdate: setShown })
    return () => c.stop()
  }, [inView, value, still])
  const v = still ? value : shown
  return (
    <span ref={ref} className={cn('num-display', className)}>
      {v.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  )
}

type Delta = { value: number; label?: string; positiveIsGood?: boolean; decimals?: number }

// ───────────────────────────── Hero stat card (ref-cognify) ─────────────────────────────
export function HeroStatCard({
  label,
  value,
  decimals = 0,
  suffix,
  caption,
  delta,
  cta,
  emptyText,
  className,
}: {
  label: string
  value: number | null
  decimals?: number
  suffix?: string
  caption?: string
  delta?: Delta | null
  cta?: { label: string; href: string }
  emptyText?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'bg-gradient-hero shadow-hero relative isolate flex min-h-[220px] flex-col overflow-hidden rounded-[24px] p-6 text-white',
        className,
      )}
    >
      {/* Curved light "swoosh" highlight */}
      <svg
        aria-hidden
        viewBox="0 0 300 220"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
      >
        <defs>
          <linearGradient id="hero-sw" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="0.6" stopColor="#FFFFFF" stopOpacity="0.32" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.08" />
          </linearGradient>
          <filter id="hero-blur">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
        </defs>
        <path
          d="M60 230 C120 150 200 110 320 96 L320 128 C210 140 140 175 96 230Z"
          fill="url(#hero-sw)"
          filter="url(#hero-blur)"
        />
        <circle cx="270" cy="30" r="70" fill="#FFFFFF" opacity="0.07" />
      </svg>
      <p className="text-sm font-medium text-white/90">{label}</p>
      {value == null ? (
        <p className="mt-3 text-base font-semibold text-white">{emptyText ?? 'Not enough data yet'}</p>
      ) : (
        <p className="mt-2 flex items-baseline gap-1.5 text-5xl leading-none font-semibold">
          <CountUp value={value} decimals={decimals} />
          {suffix && <span className="text-xl font-semibold text-white/85">{suffix}</span>}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {delta && (
          <span className="frost num inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold">{`${delta.value > 0 ? '↑ +' : delta.value < 0 ? '↓ ' : '→ '}${delta.value.toFixed(delta.decimals ?? 2)}${delta.label ? ` ${delta.label}` : ''}`}</span>
        )}
        {caption && <span className="text-sm text-white/90">{caption}</span>}
      </div>
      {cta && (
        <Link
          href={cta.href}
          className="frost mt-auto inline-flex h-10 w-fit items-center gap-2 self-start rounded-full px-4 text-sm font-semibold text-white transition-colors hover:brightness-125"
        >
          {cta.label} <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  )
}

// ───────────────────────────── Pastel stat tile (ref-cognify) ─────────────────────────────
const TILE = {
  blue: { bg: 'bg-tile-blue', badge: 'bg-badge-blue' },
  green: { bg: 'bg-tile-green', badge: 'bg-badge-green' },
  peach: { bg: 'bg-tile-peach', badge: 'bg-badge-peach' },
  lilac: { bg: 'bg-tile-lilac', badge: 'bg-badge-lilac' },
  rose: { bg: 'bg-tile-rose', badge: 'bg-badge-rose' },
} as const
export type TileTone = keyof typeof TILE

export function PastelStatTile({
  label,
  value,
  decimals = 0,
  suffix,
  helper,
  icon,
  tile = 'blue',
  delta,
  href,
  spark,
  emptyText,
  className,
}: {
  label: string
  value: number | null
  decimals?: number
  suffix?: string
  helper?: React.ReactNode
  /** A rendered icon element, e.g. <Users /> (elements serialize across the server/client boundary). */
  icon?: React.ReactNode
  tile?: TileTone
  delta?: Delta | null
  href?: string
  spark?: number[]
  emptyText?: string
  className?: string
}) {
  const t = TILE[tile]
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-ink-700 text-sm font-medium">{label}</p>
        {icon && (
          <span
            aria-hidden
            className={cn(
              'grid size-9 shrink-0 place-items-center rounded-[12px] text-white shadow-[0_6px_14px_-6px_rgb(15_23_42/0.35)] [&_svg]:size-[18px]',
              t.badge,
            )}
          >
            {icon}
          </span>
        )}
      </div>
      {value == null ? (
        <p className="text-ink-900 mt-4 text-base font-semibold">{emptyText ?? 'Not enough data'}</p>
      ) : (
        <p className="text-ink-900 mt-3 flex items-baseline gap-1 text-4xl leading-none font-semibold">
          <CountUp value={value} decimals={decimals} />
          {suffix && <span className="text-ink-500 text-lg">{suffix}</span>}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {delta && (
          <DeltaChip
            value={delta.value}
            label={delta.label}
            positiveIsGood={delta.positiveIsGood}
            decimals={delta.decimals}
          />
        )}
        {helper && <p className="text-ink-500 text-sm">{helper}</p>}
      </div>
      {spark && spark.length > 1 && (
        <Sparkline data={spark} className="mt-3 h-8 w-full" label={`${label} trend`} />
      )}
    </>
  )
  const cls = cn(
    'group relative block rounded-[20px] p-5',
    t.bg,
    href && 'transition-transform duration-200 hover:-translate-y-0.5',
    className,
  )
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

// ───────────────────────────── Blue stat banner (ref-kouliah) ─────────────────────────────
export type BannerStat = {
  icon: Icon3DName
  label: string
  value: React.ReactNode
  pct?: number | null
  helper?: string
  href?: string
}

export function StatBanner({ stats, className }: { stats: BannerStat[]; className?: string }) {
  const scroller = React.useRef<HTMLUListElement>(null)
  const [active, setActive] = React.useState(0)
  return (
    <div
      className={cn(
        'bg-gradient-banner shadow-hero relative overflow-hidden rounded-[24px] text-white',
        className,
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 800 160"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
      >
        <circle cx="760" cy="10" r="120" fill="#FFFFFF" opacity="0.06" />
        <circle cx="60" cy="170" r="90" fill="#FFFFFF" opacity="0.05" />
      </svg>
      <ul
        ref={scroller}
        onScroll={(e) =>
          setActive(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))
        }
        className="relative flex snap-x snap-mandatory scrollbar-none overflow-x-auto md:grid md:snap-none md:overflow-visible"
        style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
      >
        {stats.map((s, i) => {
          const inner = (
            <div className="flex items-center gap-4">
              <Icon3DBadge name={s.icon} size={58} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/90">{s.label}</p>
                <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
                  <span className="num-display text-3xl leading-tight font-semibold">{s.value}</span>
                  {s.pct != null && (
                    <span className="frost num rounded-full px-2 py-0.5 text-xs font-semibold">
                      {Math.round(s.pct)}%
                    </span>
                  )}
                </div>
                {s.helper && <p className="mt-1 text-sm text-white/90">{s.helper}</p>}
              </div>
            </div>
          )
          return (
            <li
              key={s.label}
              className={cn(
                'w-full shrink-0 snap-start p-5 sm:p-6 md:w-auto',
                i > 0 && 'md:border-l md:border-white/20',
              )}
            >
              {s.href ? (
                <Link href={s.href} className="block rounded-2xl outline-offset-4 hover:opacity-95">
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </li>
          )
        })}
      </ul>
      {stats.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-3 md:hidden" aria-hidden>
          {stats.map((s, i) => (
            <span
              key={s.label}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === active ? 'w-5 bg-white' : 'w-1.5 bg-white/45',
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ───────────────────────────── Illustrated score card (ref-kouliah GPA) ─────────────────────────────
export function IllustratedScoreCard({
  label,
  value,
  decimals = 2,
  caption,
  reason,
  scene = 'sky-path',
  help,
  className,
}: {
  label: string
  value: number | null
  decimals?: number
  caption?: string
  reason?: string | null
  scene?: SceneName
  help?: GlossaryTerm
  className?: string
}) {
  return (
    <div
      className={cn(
        'bg-gradient-hero shadow-hero relative isolate flex min-h-[260px] flex-col overflow-hidden rounded-[24px] text-white',
        className,
      )}
    >
      <div className="relative z-10 p-6">
        <p className="flex items-center gap-1 text-sm font-medium text-white/90">
          {label}
          {help && <HelpTip term={help} label={label} tone="inverse" />}
        </p>
        {value == null ? (
          <>
            <p className="mt-2 text-4xl font-semibold">—</p>
            <p className="mt-2 max-w-[28ch] text-sm text-white/90">{reason ?? 'Not enough data yet.'}</p>
          </>
        ) : (
          <>
            <p className="mt-1 text-5xl leading-none font-semibold">
              <CountUp value={value} decimals={decimals} />
            </p>
            {caption && <p className="mt-2 text-sm text-white/90">{caption}</p>}
          </>
        )}
      </div>
      <div className="lowbw:hidden pointer-events-none mt-auto">
        <Scene name={scene} />
      </div>
    </div>
  )
}

/** Small decorative 3D icon next to a greeting ("Hello, Ananya" + waving hand). */
export function Greeting3D() {
  return <Icon3D name="wave" size={30} className="inline-block -translate-y-0.5" />
}
