'use client'

import * as React from 'react'
import { fmtRelative } from '@/lib/utils'
import { Segmented } from '@/components/ui/navigation'
import { Pill } from '@/components/ui/primitives'
import { PercentBar, ProgressTable, StackedRoundedBarChart, type StackRow } from '@/components/charts/dashboard'

export type BranchHealthRow = {
  id: string
  code: string
  name: string
  headName: string | null
  students: number
  mentors: number
  coverage: number | null
  flagged: number
  incomplete: number
  missing: number
  avgSgpa: number | null
  prevSgpa: number | null
  lastActivity: string | null
}

type Metric = 'sgpa' | 'coverage' | 'missing'

/** Branch comparison (MB-12): branches only — individual students are never ranked. */
export function BranchComparison({ rows }: { rows: BranchHealthRow[] }) {
  const [metric, setMetric] = React.useState<Metric>('sgpa')
  const bars: StackRow[] = rows.map((r) => ({
    label: r.code,
    sub: `${r.name} · ${r.students} students`,
    href: `/principal/branches/${r.code}`,
    values: (metric === 'sgpa'
        ? { prev: r.prevSgpa == null ? null : Number(r.prevSgpa.toFixed(2)), latest: r.avgSgpa == null ? null : Number(r.avgSgpa.toFixed(2)) }
        : metric === 'coverage'
          ? { value: r.coverage }
          : { value: r.students ? Math.round((r.missing / r.students) * 100) : null }) as Record<string, number | null>,
  }))
  const toggle = (
    <Segmented
      size="sm"
      label="Compare by"
      value={metric}
      onChange={setMetric}
      options={[
        { value: 'sgpa', label: 'SGPA' },
        { value: 'coverage', label: 'Coverage' },
        { value: 'missing', label: 'Missing' },
      ]}
    />
  )
  return metric === 'sgpa' ? (
    <StackedRoundedBarChart
      title="Branch comparison"
      description="Average of each student’s previous and latest SGPA, per branch. Select a branch to open it."
      series={[
        { key: 'prev', label: 'Previous sem', color: 'var(--chart-3)' },
        { key: 'latest', label: 'Latest sem', color: 'var(--chart-1)' },
      ]}
      rows={bars}
      max={10}
      unit=""
      decimals={2}
      action={toggle}
      empty="Appears once students have an SGPA."
    />
  ) : (
    <StackedRoundedBarChart
      title="Branch comparison"
      description={metric === 'coverage' ? 'Share of students with an active mentor.' : 'Share of students with no records or a missing semester.'}
      series={[{ key: 'value', label: metric === 'coverage' ? 'Coverage' : 'Missing records', color: metric === 'coverage' ? 'var(--chart-2)' : 'var(--chart-4)' }]}
      rows={bars}
      max={100}
      unit="%"
      decimals={0}
      action={toggle}
      empty="No students yet."
    />
  )
}

export function BranchHealthTable({ rows }: { rows: BranchHealthRow[] }) {
  return (
    <ProgressTable
      title="Branch health"
      description="Coverage, flags and profile completion for every branch"
      rows={rows}
      href={(r) => `/principal/branches/${r.code}`}
      seeMore="/principal/branches"
      empty={<p className="text-sm text-ink-500">No branches yet.</p>}
      columns={[
        {
          key: 'branch',
          header: 'Branch',
          render: (r) => (
            <span className="block min-w-0">
              <span className="block font-semibold text-ink-900">{r.code}</span>
              <span className="block truncate text-xs text-ink-500">{r.name}</span>
            </span>
          ),
        },
        { key: 'hod', header: 'HOD', render: (r) => (r.headName ? <span className="text-ink-700">{r.headName}</span> : <Pill tone="accent">No HOD</Pill>) },
        { key: 'students', header: 'Students', className: 'text-right', render: (r) => <span className="num font-semibold text-ink-900">{r.students}</span> },
        { key: 'mentors', header: 'Mentors', className: 'text-right', render: (r) => <span className="num text-ink-700">{r.mentors}</span> },
        { key: 'coverage', header: 'Coverage', render: (r) => <PercentBar value={r.coverage} label={`${r.code} mentoring coverage`} /> },
        { key: 'flagged', header: 'Flagged', className: 'text-right', render: (r) => <span className="num text-ink-900">{r.flagged}</span> },
        { key: 'incomplete', header: 'Incomplete', className: 'text-right', render: (r) => <span className="num text-ink-700">{r.incomplete}</span> },
        { key: 'activity', header: 'Last activity', mobile: false, render: (r) => <span className="text-xs text-ink-500">{r.lastActivity ? fmtRelative(r.lastActivity) : '—'}</span> },
      ]}
    />
  )
}
