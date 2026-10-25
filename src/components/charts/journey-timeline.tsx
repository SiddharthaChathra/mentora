'use client'

import * as React from 'react'
import Link from 'next/link'
import { BookOpen, CalendarCheck2, CheckCircle2, Flag, GraduationCap, MessageSquareText } from 'lucide-react'
import { cn, fmtDate } from '@/lib/utils'
import { EmptyState } from '@/components/ui/states'

export type JourneyEventType = 'semester' | 'feedback' | 'goal' | 'action' | 'session' | 'resource'

export type JourneyEvent = {
  id: string
  type: JourneyEventType
  date: string
  title: string
  subtitle?: string
  href?: string
  meta?: string
}

const TYPE: Record<JourneyEventType, { label: string; icon: React.ComponentType<{ className?: string }>; chip: string; dot: string }> = {
  semester: { label: 'Results', icon: GraduationCap, chip: 'bg-primary-50 text-primary-600', dot: 'bg-primary-600' },
  feedback: { label: 'Feedback', icon: MessageSquareText, chip: 'bg-accent-100 text-accent-700', dot: 'bg-accent-500' },
  goal: { label: 'Goals', icon: Flag, chip: 'bg-[#EEEAFD] text-[#6D28D9]', dot: 'bg-violet-500' },
  action: { label: 'Completed', icon: CheckCircle2, chip: 'bg-success-100 text-success-700', dot: 'bg-success-500' },
  session: { label: 'Sessions', icon: CalendarCheck2, chip: 'bg-info-100 text-info-700', dot: 'bg-info-500' },
  resource: { label: 'Resources', icon: BookOpen, chip: 'bg-warning-100 text-warning-700', dot: 'bg-warning-500' },
}

export function JourneyTimeline({ events }: { events: JourneyEvent[] }) {
  const [filter, setFilter] = React.useState<JourneyEventType | 'all'>('all')
  const present = (Object.keys(TYPE) as JourneyEventType[]).filter((t) => events.some((e) => e.type === t))
  const shown = [...events].filter((e) => filter === 'all' || e.type === filter).sort((a, b) => +new Date(a.date) - +new Date(b.date))
  const scroller = React.useRef<HTMLOListElement>(null)

  React.useEffect(() => {
    // Desktop: start scrolled to the most recent events.
    const el = scroller.current
    if (el && window.matchMedia('(min-width: 1024px)').matches) el.scrollLeft = el.scrollWidth
  }, [filter])

  if (events.length === 0)
    return <EmptyState illustration="no-sessions" title="The journey starts here" description="Semesters, feedback, goals and sessions will appear on this timeline as they happen." />

  return (
    <div>
      <div role="group" aria-label="Filter timeline" className="scrollbar-none -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {(['all', ...present] as const).map((t) => {
          const active = filter === t
          const meta = t === 'all' ? null : TYPE[t]
          return (
            <button
              key={t}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(t)}
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors',
                active ? 'border-primary-600 bg-primary-600 text-white' : 'border-line bg-surface text-ink-700 hover:border-line-strong',
              )}
            >
              {meta && <span className={cn('size-2 rounded-full', meta.dot)} />}
              {t === 'all' ? 'Everything' : meta!.label}
              <span className={cn('num text-xs', active ? 'text-white/70' : 'text-ink-500')}>
                {t === 'all' ? events.length : events.filter((e) => e.type === t).length}
              </span>
            </button>
          )
        })}
      </div>

      <ol
        ref={scroller}
        className="relative space-y-5 pl-8 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-line-strong lg:flex lg:snap-x lg:gap-4 lg:space-y-0 lg:overflow-x-auto lg:pt-10 lg:pb-4 lg:pl-0 lg:before:top-[52px] lg:before:right-0 lg:before:bottom-auto lg:before:left-0 lg:before:h-px lg:before:w-full"
        aria-label="Academic journey, oldest first"
      >
        {shown.map((e) => {
          const t = TYPE[e.type]
          const Icon = t.icon
          const inner = (
            <>
              <div className="flex items-center gap-2">
                <span className={cn('grid size-8 place-items-center rounded-[10px]', t.chip)}>
                  <Icon className="size-4" />
                </span>
                <span className="eyebrow">{t.label.replace(/s$/, '')}</span>
              </div>
              <p className="mt-3 line-clamp-2 font-medium text-ink-900">{e.title}</p>
              {e.subtitle && <p className="mt-1 line-clamp-2 text-sm text-ink-500">{e.subtitle}</p>}
              <p className="num mt-3 text-xs text-ink-500">
                {fmtDate(e.date)}
                {e.meta ? ` · ${e.meta}` : ''}
              </p>
            </>
          )
          return (
            <li key={`${e.type}-${e.id}`} className="relative lg:w-64 lg:shrink-0 lg:snap-start">
              <span aria-hidden className={cn('absolute top-5 -left-[23px] size-3 rounded-full ring-4 ring-canvas lg:-top-[34px] lg:left-5', t.dot)} />
              {e.href ? (
                <Link
                  href={e.href}
                  className="block h-full rounded-xl bg-surface p-4 shadow-2 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-3"
                >
                  {inner}
                </Link>
              ) : (
                <div className="h-full rounded-xl bg-surface p-4 shadow-2">{inner}</div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
