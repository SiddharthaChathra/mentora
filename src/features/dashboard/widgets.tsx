'use client'

import { Avatar } from '@/components/ui/avatar'
import { ProgressBar, StatusPill } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/states'
import { PercentBar, ProgressTable } from '@/components/charts/dashboard'

export type RecentResultRow = {
  id: string
  studentId: string
  name: string
  hasAvatar: boolean
  usn: string | null
  semesterNo: number
  sgpa: number | null
  passPct: number | null
  status: string
  href: string
}

/** "Recent Results" (ref-cognify): latest semester per student, pass rate bar always shows its number. */
export function RecentResultsTable({ rows, seeMore, title = 'Recent results' }: { rows: RecentResultRow[]; seeMore?: string; title?: string }) {
  return (
    <ProgressTable<RecentResultRow>
      title={title}
      description="Latest semester per student"
      rows={rows}
      href={(r) => r.href}
      seeMore={seeMore}
      empty={<EmptyState compact illustration="no-results" title="No results yet" description="Results appear here once students add a semester." />}
      columns={[
        {
          key: 'name',
          header: 'Student',
          render: (r) => (
            <span className="flex min-w-0 items-center gap-3">
              <Avatar userId={r.studentId} name={r.name} hasImage={r.hasAvatar} size="sm" />
              <span className="min-w-0">
                <span className="block truncate font-semibold text-ink-900">{r.name}</span>
                {r.usn && <span className="num block truncate text-xs text-ink-500">{r.usn}</span>}
              </span>
            </span>
          ),
        },
        { key: 'sem', header: 'Semester', render: (r) => <span className="num text-ink-700">Sem {r.semesterNo}</span> },
        { key: 'sgpa', header: 'SGPA', render: (r) => <span className="num font-semibold text-ink-900">{r.sgpa == null ? '—' : r.sgpa.toFixed(2)}</span> },
        { key: 'pass', header: 'Subjects passed', className: 'min-w-44', render: (r) => <PercentBar value={r.passPct} label={`${r.name} subjects passed`} /> },
        { key: 'status', header: 'Status', render: (r) => <StatusPill status={r.status} /> },
      ]}
    />
  )
}

export type WorkloadRow = { id: string; name: string; email: string; hasAvatar: boolean; mentees: number; capacity: number; flagged: number; activity: number }

/** HOD "Mentor workload": load against capacity (over capacity is the problem, so it reads red), with the number always shown. */
export function WorkloadTable({ rows }: { rows: WorkloadRow[] }) {
  return (
    <ProgressTable<WorkloadRow>
      title="Mentor workload"
      description="Assigned mentees against each mentor’s capacity"
      rows={rows}
      href={(r) => `/hod/mentors/${r.id}`}
      seeMore="/hod/mentors"
      empty={<EmptyState compact illustration="no-mentees" title="No active mentors" description="Invite mentors from Users & roles." />}
      columns={[
        {
          key: 'name',
          header: 'Mentor',
          render: (r) => (
            <span className="flex min-w-0 items-center gap-3">
              <Avatar userId={r.id} name={r.name} hasImage={r.hasAvatar} size="sm" />
              <span className="min-w-0">
                <span className="block truncate font-semibold text-ink-900">{r.name}</span>
                <span className="block truncate text-xs text-ink-500">{r.email}</span>
              </span>
            </span>
          ),
        },
        { key: 'mentees', header: 'Mentees', render: (r) => <span className="num font-semibold text-ink-900">{r.mentees} / {r.capacity}</span> },
        {
          key: 'load',
          header: 'Load',
          className: 'min-w-44',
          render: (r) => {
            const pct = r.capacity ? (r.mentees / r.capacity) * 100 : 0
            return (
              <span className="flex items-center gap-3">
                <ProgressBar value={Math.min(pct, 100)} tone={pct > 100 ? 'danger' : pct >= 90 ? 'warning' : 'brand'} label={`${r.name} load`} />
                <span className={pct > 100 ? 'num w-10 shrink-0 text-right text-xs font-semibold text-danger-700' : 'num w-10 shrink-0 text-right text-xs font-semibold text-ink-900'}>{Math.round(pct)}%</span>
              </span>
            )
          },
        },
        { key: 'flagged', header: 'Flagged', render: (r) => <span className={r.flagged ? 'num font-semibold text-danger-700' : 'num text-ink-500'}>{r.flagged}</span> },
        { key: 'activity', header: 'Actions · 30d', render: (r) => <span className="num text-ink-700">{r.activity}</span> },
      ]}
    />
  )
}
