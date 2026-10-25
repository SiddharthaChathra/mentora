'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { AlertTriangle, LayoutGrid, List, Search } from 'lucide-react'
import { useLocalStorage } from '@/lib/hooks'
import { cn, fmt2, fmtDate, fmtRelative } from '@/lib/utils'
import type { RiskFlag } from '@/lib/risk'
import { Avatar } from '@/components/ui/avatar'
import { Pill } from '@/components/ui/primitives'
import { Segmented } from '@/components/ui/navigation'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlay'
import { Sparkline } from '@/components/charts/sparkline'
import { EmptyState } from '@/components/ui/states'
import type { SlimRoster } from '@/server/services/roster'
import { SavedViewChips, SaveViewButton, useSavedViews } from './saved-views'

export function RiskChip({ flags, compact }: { flags: RiskFlag[]; compact?: boolean }) {
  if (!flags.length) return compact ? null : <Pill tone="success" dot>On track</Pill>
  const high = flags.some((f) => f.severity === 'high')
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[0.75rem] font-medium',
            high ? 'bg-danger-100 text-danger-700' : 'bg-warning-100 text-warning-700',
          )}
          aria-label={`${flags.length} risk indicator${flags.length === 1 ? '' : 's'}: ${flags.map((f) => f.label).join(', ')}`}
        >
          <span className={cn('size-2 rounded-full', high ? 'animate-pulse-ring bg-danger-500 motion-reduce:animate-none lowbw:animate-none' : 'bg-warning-500')} />
          {compact ? flags.length : flags[0]!.label}
          {!compact && flags.length > 1 && <span className="num">+{flags.length - 1}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <p className="eyebrow">Why flagged</p>
        <ul className="mt-2 space-y-2.5">
          {flags.map((f) => (
            <li key={f.key} className="flex gap-2.5 text-sm">
              <AlertTriangle className={cn('mt-0.5 size-4 shrink-0', f.severity === 'high' ? 'text-danger-600' : 'text-warning-700')} />
              <span>
                <span className="font-medium text-ink-900">{f.label}</span>
                <span className="mt-0.5 block text-ink-500">{f.reason}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-line pt-2.5 text-xs text-ink-500">Flags are explanations based on recorded data and your department’s thresholds — never a score.</p>
      </PopoverContent>
    </Popover>
  )
}

export function MenteeCard({ m, href }: { m: SlimRoster; href: string }) {
  return (
    <motion.div layoutId={`mentee-${m.id}`} className="h-full">
      <div className="group relative flex h-full flex-col rounded-xl bg-surface p-4 shadow-2 transition-[transform,box-shadow] focus-within:shadow-3 hover:-translate-y-0.5 hover:shadow-3">
        <div className="flex items-start gap-3">
          <Avatar userId={m.id} name={m.name} hasImage={!!m.avatarPath} version={m.avatarPath} />
          <div className="min-w-0 flex-1">
            <Link href={href} className="block truncate font-semibold text-ink-900 outline-none group-hover:text-primary-700 after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-primary-600">
              {m.name ?? 'New student'}
            </Link>
            <p className="num truncate text-xs text-ink-500">
              {m.usn ?? 'USN pending'}
              {m.currentSemester && ` · Sem ${m.currentSemester}`}
              {m.sectionName && ` · ${m.sectionName}`}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[0.6875rem] text-ink-500">CGPA</p>
            <p className="num-display text-2xl font-semibold text-ink-900">{m.cgpa != null ? fmt2(m.cgpa) : '—'}</p>
          </div>
          {m.sgpaSeries.length > 1 ? (
            <Sparkline data={m.sgpaSeries} className="h-9 w-24" label={`${m.name} SGPA trend`} tone={m.risk === 'high' ? 'danger' : m.risk === 'medium' ? 'warning' : 'brand'} min={Math.max(0, Math.min(...m.sgpaSeries) - 1)} max={10} />
          ) : (
            <span className="text-xs text-ink-500">{m.hasRecords ? 'One semester' : 'No records'}</span>
          )}
        </div>
        <div className="relative z-[1] mt-4 flex flex-wrap items-center gap-1.5 border-t border-line/70 pt-3">
          <RiskChip flags={m.flags} />
          {m.submittedCount > 0 && <Pill tone="info">{m.submittedCount} to verify</Pill>}
          {m.openFollowUps > 0 && <Pill tone="accent">{m.openFollowUps} follow-up{m.openFollowUps === 1 ? '' : 's'} due</Pill>}
        </div>
      </div>
    </motion.div>
  )
}

type Filters = { q: string; semester: string; section: string; risk: string; follow: string }
const DEFAULT_FILTERS: Filters = { q: '', semester: 'all', section: 'all', risk: 'all', follow: 'all' }
const RISK_NAME: Record<string, string> = { flagged: 'Needs attention', high: 'High priority', none: 'On track' }
const FOLLOW_NAME: Record<string, string> = { due: 'Follow-up due', nosession: 'No session yet' }

const filterQuery = (f: Filters) => new URLSearchParams(Object.entries(f).filter(([k, v]) => v && v !== DEFAULT_FILTERS[k as keyof Filters])).toString()
const viewName = (f: Filters) =>
  [f.semester !== 'all' && `Sem ${f.semester}`, f.section !== 'all' && `Section ${f.section}`, RISK_NAME[f.risk], FOLLOW_NAME[f.follow], f.q && `“${f.q}”`].filter(Boolean).join(' · ')

export function RosterBrowser({
  rows,
  hrefBase,
  hrefSuffix = '',
  showMentor,
  initial,
}: {
  rows: SlimRoster[]
  hrefBase: string
  hrefSuffix?: string
  showMentor?: boolean
  initial?: Partial<Filters>
}) {
  const [storedView, setStoredView] = useLocalStorage('m_roster_view', 'grid')
  const view: 'grid' | 'list' = storedView === 'list' ? 'list' : 'grid'
  const [f, setF] = React.useState<Filters>({ ...DEFAULT_FILTERS, ...initial })
  const saved = useSavedViews('m_roster_saved')
  const activeQuery = filterQuery(f)
  const sections = [...new Set(rows.map((r) => r.sectionName).filter(Boolean))].sort() as string[]
  const shown = rows.filter(
    (r) =>
      (!f.q || `${r.name} ${r.usn}`.toLowerCase().includes(f.q.toLowerCase())) &&
      (f.semester === 'all' || String(r.currentSemester) === f.semester) &&
      (f.section === 'all' || r.sectionName === f.section) &&
      (f.risk === 'all' || (f.risk === 'flagged' ? r.risk !== 'none' : r.risk === f.risk)) &&
      (f.follow === 'all' || (f.follow === 'due' ? r.openFollowUps > 0 : f.follow === 'nosession' ? !r.lastSession : true)),
  )
  const sel = 'h-10 rounded-full border border-line bg-surface px-4 text-sm shadow-1'
  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-500" />
            <input
              type="search"
              aria-label="Search by name or USN"
              placeholder="Search by name or USN…"
              value={f.q}
              onChange={(e) => setF({ ...f, q: e.target.value })}
              className="h-10 w-full rounded-full border border-line bg-surface pr-4 pl-10 text-sm shadow-1 outline-none focus:border-primary-500 focus:shadow-[0_0_0_4px_var(--primary-100)]"
            />
          </div>
          {sections.length > 1 && (
            <select aria-label="Section" value={f.section} onChange={(e) => setF({ ...f, section: e.target.value })} className={sel}>
              <option value="all">All sections</option>
              {sections.map((s) => (
                <option key={s} value={s}>
                  Section {s}
                </option>
              ))}
            </select>
          )}
          <select aria-label="Risk" value={f.risk} onChange={(e) => setF({ ...f, risk: e.target.value })} className={sel}>
            <option value="all">Any status</option>
            <option value="flagged">Needs attention</option>
            <option value="high">High priority</option>
            <option value="none">On track</option>
          </select>
          <select aria-label="Follow-ups" value={f.follow} onChange={(e) => setF({ ...f, follow: e.target.value })} className={sel}>
            <option value="all">Any follow-up</option>
            <option value="due">Follow-up due</option>
            <option value="nosession">No session yet</option>
          </select>
          {activeQuery && <SaveViewButton onClick={() => saved.save(viewName(f), activeQuery)} />}
        </div>
        <Segmented
          size="sm"
          label="Layout"
          value={view}
          onChange={setStoredView}
          options={[
            { value: 'grid', label: 'Grid', icon: LayoutGrid },
            { value: 'list', label: 'List', icon: List },
          ]}
        />
      </div>
      <SavedViewChips
        views={saved.views}
        active={activeQuery}
        onApply={(q) => setF(q === activeQuery ? DEFAULT_FILTERS : { ...DEFAULT_FILTERS, ...Object.fromEntries(new URLSearchParams(q)) })}
        onRemove={saved.remove}
      />
      <p className="mt-3 mb-3 text-sm text-ink-500" aria-live="polite">
        Showing <span className="num text-ink-900">{shown.length}</span> of <span className="num">{rows.length}</span>
      </p>
      {shown.length === 0 ? (
        <EmptyState illustration={rows.length ? 'no-results' : 'no-mentees'} title={rows.length ? 'No one matches these filters' : 'No mentees assigned yet'} description={rows.length ? 'Clear a filter to see more students.' : 'Your HOD assigns mentees. They’ll appear here as soon as that happens.'} />
      ) : view === 'grid' ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((m) => (
            <li key={m.id}>
              <MenteeCard m={m} href={`${hrefBase}/${m.id}${hrefSuffix}`} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="overflow-hidden rounded-xl bg-surface shadow-2">
          <table className="hidden w-full text-sm md:table">
            <thead className="bg-surface-muted text-left text-xs text-ink-500">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Student</th>
                <th scope="col" className="px-3 py-3 font-semibold">Sem</th>
                {showMentor && <th scope="col" className="px-3 py-3 font-semibold">Mentor</th>}
                <th scope="col" className="px-3 py-3 text-right font-semibold">CGPA</th>
                <th scope="col" className="px-3 py-3 font-semibold">Trend</th>
                <th scope="col" className="px-3 py-3 font-semibold">Status</th>
                <th scope="col" className="px-5 py-3 font-semibold">Last session</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((m) => (
                <tr key={m.id} className="border-t border-line/70 hover:bg-surface-muted">
                  <td className="px-5 py-3">
                    <Link href={`${hrefBase}/${m.id}${hrefSuffix}`} className="flex items-center gap-3 font-medium text-ink-900 hover:text-primary-700">
                      <Avatar userId={m.id} name={m.name} hasImage={!!m.avatarPath} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate">{m.name ?? 'New student'}</span>
                        <span className="num block text-xs font-normal text-ink-500">{m.usn}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="num px-3 py-3 text-ink-700">
                    {m.currentSemester ?? '—'}
                    {m.sectionName && <span className="text-ink-500"> · {m.sectionName}</span>}
                  </td>
                  {showMentor && <td className="px-3 py-3 text-ink-700">{m.mentorName ?? <Pill tone="accent">Unassigned</Pill>}</td>}
                  <td className="num px-3 py-3 text-right text-ink-900">{fmt2(m.cgpa)}</td>
                  <td className="px-3 py-3">{m.sgpaSeries.length > 1 ? <Sparkline data={m.sgpaSeries} className="h-7 w-20" label={`${m.name} trend`} min={0} max={10} /> : <span className="text-ink-500">—</span>}</td>
                  <td className="px-3 py-3">
                    <RiskChip flags={m.flags} />
                  </td>
                  <td className="px-5 py-3 text-ink-700">{m.lastSession ? fmtRelative(m.lastSession) : <span className="text-ink-500">None</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="divide-y divide-line md:hidden">
            {shown.map((m) => (
              <li key={m.id} className="relative flex items-center gap-3 p-4">
                  <Avatar userId={m.id} name={m.name} hasImage={!!m.avatarPath} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link href={`${hrefBase}/${m.id}${hrefSuffix}`} className="block truncate font-medium text-ink-900 after:absolute after:inset-0">
                      {m.name}
                    </Link>
                    <p className="num text-xs text-ink-500">
                      {m.usn} · CGPA {fmt2(m.cgpa)} {m.nextSession && `· next ${fmtDate(m.nextSession, 'd MMM')}`}
                    </p>
                  </div>
                  <span className="relative z-[1]">
                    <RiskChip flags={m.flags} compact />
                  </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
