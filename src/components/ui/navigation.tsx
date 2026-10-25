'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'motion/react'
import { BarChart3, BookOpenText, CalendarDays, ChevronLeft, ChevronRight, FileText, GraduationCap, LayoutDashboard, MessageSquareHeart, Route, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDebouncedCallback } from '@/lib/hooks'

const TAB_ICONS = { overview: LayoutDashboard, academics: GraduationCap, analytics: BarChart3, mentoring: MessageSquareHeart, resources: BookOpenText, sessions: CalendarDays, journey: Route, report: FileText }
export type TabIcon = keyof typeof TAB_ICONS

/** Link-based tabs with a sliding indicator; the active tab is part of the URL. Icons are named so server components can pass them. */
export function TabLinks({
  tabs,
  param = 'tab',
  className,
  layoutId = 'tab-indicator',
}: {
  tabs: { value: string; label: string; count?: number; icon?: TabIcon }[]
  param?: string
  className?: string
  layoutId?: string
}) {
  const pathname = usePathname()
  const sp = useSearchParams()
  const active = sp.get(param) ?? tabs[0]?.value
  return (
    <nav aria-label="Sections" className={cn('scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0', className)}>
      <ul className="flex min-w-max gap-1 rounded-full bg-surface p-1.5 shadow-2">
        {tabs.map((t) => {
          const params = new URLSearchParams(sp.toString())
          if (t.value === tabs[0]?.value) params.delete(param)
          else params.set(param, t.value)
          const href = `${pathname}${params.toString() ? `?${params}` : ''}`
          const isActive = t.value === active
          const Icon = t.icon ? TAB_ICONS[t.icon] : null
          return (
            <li key={t.value} className="relative">
              <Link
                href={href}
                scroll={false}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative z-[1] flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors',
                  isActive ? 'text-primary-700' : 'text-ink-500 hover:text-ink-900',
                )}
              >
                {Icon && <Icon className="size-4" />}
                {t.label}
                {t.count != null && t.count > 0 && (
                  <span className="num rounded-full bg-primary-600 px-1.5 py-0.5 text-[0.6875rem] text-white">{t.count}</span>
                )}
              </Link>
              {isActive && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-full bg-primary-50" />}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Segmented control (local state or URL param). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
  size = 'md',
}: {
  options: { value: T; label: string; icon?: React.ComponentType<{ className?: string }> }[]
  value: T
  onChange: (v: T) => void
  label: string
  className?: string
  size?: 'sm' | 'md'
}) {
  const id = React.useId()
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-full bg-surface-muted p-1', className)}>
      {options.map((o) => {
        const active = o.value === value
        const Icon = o.icon
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative flex items-center gap-1.5 rounded-full font-semibold transition-colors',
              size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-sm',
              active ? 'text-ink-900' : 'text-ink-500 hover:text-ink-900',
            )}
          >
            {active && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-full bg-surface shadow-[0_2px_8px_-2px_rgb(37_99_235/0.25)]" />}
            <span className="relative flex items-center gap-1.5">
              {Icon && <Icon className="size-4" />}
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Update one or more URL search params (resets page). */
export function useSetParams() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  return React.useCallback(
    (updates: Record<string, string | null | undefined>, opts: { keepPage?: boolean } = {}) => {
      const params = new URLSearchParams(sp.toString())
      for (const [k, v] of Object.entries(updates)) {
        if (v == null || v === '' || v === 'all') params.delete(k)
        else params.set(k, v)
      }
      if (!opts.keepPage) params.delete('page')
      router.replace(`${pathname}${params.toString() ? `?${params}` : ''}`, { scroll: false })
    },
    [router, pathname, sp],
  )
}

export function SearchInput({ placeholder = 'Search…', param = 'q', className }: { placeholder?: string; param?: string; className?: string }) {
  const sp = useSearchParams()
  const setParams = useSetParams()
  const [value, setValue] = React.useState(sp.get(param) ?? '')
  const push = useDebouncedCallback((v: string) => setParams({ [param]: v.trim() || null }), 300)
  return (
    <div role="search" className={cn('relative', className)}>
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-500" />
      <input
        type="search"
        aria-label={placeholder}
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          push(e.target.value)
        }}
        placeholder={placeholder}
        className="h-11 w-full rounded-full border border-line bg-surface pr-9 pl-10 text-sm text-ink-900 outline-none placeholder:text-ink-500 focus:border-primary-500 focus:shadow-[0_0_0_4px_var(--primary-100)] [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setValue('')
            setParams({ [param]: null })
          }}
          className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-ink-500 hover:bg-surface-muted"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

export function Pagination({ page, pageSize, total, className }: { page: number; pageSize: number; total: number; className?: string }) {
  const pathname = usePathname()
  const sp = useSearchParams()
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) return null
  const href = (p: number) => {
    const params = new URLSearchParams(sp.toString())
    if (p <= 1) params.delete('page')
    else params.set('page', String(p))
    return `${pathname}${params.toString() ? `?${params}` : ''}`
  }
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  const btn = 'inline-flex h-10 items-center gap-1 rounded-full border border-line bg-surface px-3.5 text-sm font-medium shadow-1'
  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-between gap-4 pt-4', className)}>
      <p className="text-sm text-ink-500">
        <span className="num text-ink-900">{from}</span>–<span className="num text-ink-900">{to}</span> of{' '}
        <span className="num text-ink-900">{total}</span>
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={cn(btn, 'hover:border-line-strong')} aria-label="Previous page">
            <ChevronLeft className="size-4" /> <span className="hidden sm:inline">Previous</span>
          </Link>
        ) : (
          <span className={cn(btn, 'opacity-40')} aria-disabled>
            <ChevronLeft className="size-4" /> <span className="hidden sm:inline">Previous</span>
          </span>
        )}
        {page < pages ? (
          <Link href={href(page + 1)} className={cn(btn, 'hover:border-line-strong')} aria-label="Next page">
            <span className="hidden sm:inline">Next</span> <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span className={cn(btn, 'opacity-40')} aria-disabled>
            <span className="hidden sm:inline">Next</span> <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </nav>
  )
}

/** Filter chip bar bound to a URL param. */
export function FilterChips({
  param,
  options,
  label,
  className,
}: {
  param: string
  options: { value: string; label: string; count?: number }[]
  label: string
  className?: string
}) {
  const sp = useSearchParams()
  const setParams = useSetParams()
  const active = sp.get(param) ?? 'all'
  return (
    <div role="group" aria-label={label} className={cn('scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0', className)}>
      {options.map((o) => {
        const isActive = o.value === active
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => setParams({ [param]: o.value })}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors',
              isActive ? 'border-primary-600 bg-primary-600 text-white' : 'border-line bg-surface text-ink-700 hover:border-primary-300 hover:text-ink-900',
            )}
          >
            {o.label}
            {o.count != null && <span className={cn('num text-xs', isActive ? 'text-white/70' : 'text-ink-500')}>{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
