import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { getSemesterScope } from '@/server/scope'
import { listBranches, loadCollege, principalBranch } from '@/server/services/branches'
import { fmtRelative } from '@/lib/utils'
import { ScopeChip } from '@/components/shell/scope-chip'
import { PageHeader } from '@/components/ui/page-header'
import { Avatar } from '@/components/ui/avatar'
import { Card, Pill, ProgressBar, StatusPill } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/states'
import { DirectoryToolbar } from '@/features/roster/directory-toolbar'

export const metadata: Metadata = { title: 'Mentors by branch' }

/** All mentors grouped by branch with workload bars; read-only (capacity and assignments stay with the HOD). */
export default async function PrincipalMentors({ searchParams }: { searchParams: Promise<{ q?: string; load?: string; branch?: string }> }) {
  await requireRole('PRINCIPAL')
  const sp = await searchParams
  const db = await createClient()
  const scope = await getSemesterScope()
  const selected = await principalBranch(db, sp.branch)
  const parts = await loadCollege(db, selected ? [selected] : await listBranches(db), scope)
  const q = sp.q?.toLowerCase()
  const groups = parts.map((p) => {
    const riskBy = new Map(p.roster.map((r) => [r.id, r.risk]))
    return {
      branch: p.branch,
      mentors: p.mentors
        .filter(
          (m) =>
            (!q || `${m.name} ${m.email} ${m.facultyId} ${m.expertise.join(' ')}`.toLowerCase().includes(q)) &&
            (!sp.load || sp.load === 'all' || (sp.load === 'over' ? m.mentees.length > m.capacity : sp.load === 'none' ? m.mentees.length === 0 : m.mentees.length <= m.capacity && m.mentees.length > 0)),
        )
        .map((m) => ({ ...m, flagged: m.mentees.filter((id) => (riskBy.get(id) ?? 'none') !== 'none').length })),
    }
  })
  const total = groups.reduce((a, g) => a + g.mentors.length, 0)
  return (
    <>
      <PageHeader title="Mentors" accent="by branch" description={`${total} mentor${total === 1 ? '' : 's'} ${selected ? `in ${selected.code}` : 'across the college'}: workload, activity and flagged mentees.`} />
      <ScopeChip scope={scope} />
      <DirectoryToolbar
        storageKey="m_principal_mentor_filters"
        searchPlaceholder="Search name, faculty ID or expertise…"
        filters={[{ param: 'load', label: 'Workload', options: [{ value: 'all', label: 'Any workload' }, { value: 'ok', label: 'Within capacity' }, { value: 'over', label: 'Over capacity' }, { value: 'none', label: 'No mentees' }] }]}
      />
      {total === 0 ? (
        <Card>
          <EmptyState illustration="no-results" title="No mentors match" description="Try another search or branch." />
        </Card>
      ) : (
        <div className="space-y-8">
          {groups
            .filter((g) => g.mentors.length)
            .map((g) => (
              <section key={g.branch.id} aria-label={`${g.branch.code} mentors`}>
                <h2 className="mb-3 flex flex-wrap items-center gap-2 text-lg font-semibold text-ink-900">
                  <Pill tone="brand">{g.branch.code}</Pill> {g.branch.name}
                  <span className="num text-sm font-medium text-ink-500">· {g.mentors.length} mentors</span>
                </h2>
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {g.mentors.map((m) => {
                    const over = m.mentees.length > m.capacity
                    return (
                      <li key={m.id} className="rounded-xl bg-surface p-5 shadow-2">
                        <div className="flex items-start gap-3">
                          <Avatar userId={m.id} name={m.name ?? m.email} hasImage={!!m.avatarPath} size="md" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-ink-900">{m.name ?? m.email}</p>
                            <p className="truncate text-sm text-ink-500">{m.designation ?? 'Profile pending'}</p>
                          </div>
                          {m.status !== 'ACTIVE' && <StatusPill status={m.status} />}
                        </div>
                        <div className="mt-4">
                          <div className="mb-1.5 flex justify-between text-xs">
                            <span className="text-ink-500">Mentees</span>
                            <span className={`num ${over ? 'font-semibold text-danger-700' : 'text-ink-900'}`}>
                              {m.mentees.length} / {m.capacity}
                            </span>
                          </div>
                          <ProgressBar value={m.mentees.length} max={m.capacity} tone={over ? 'danger' : 'brand'} label={`${m.name ?? m.email} workload`} />
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line/70 pt-3 text-center">
                          <div>
                            <p className="num-display text-lg font-semibold text-ink-900">{m.activity30}</p>
                            <p className="text-[0.6875rem] text-ink-500">Actions · 30d</p>
                          </div>
                          <div>
                            <p className={`num-display text-lg font-semibold ${m.flagged ? 'text-danger-700' : 'text-ink-900'}`}>{m.flagged}</p>
                            <p className="text-[0.6875rem] text-ink-500">Flagged</p>
                          </div>
                          <div>
                            <p className="truncate text-sm font-medium text-ink-900">{m.lastActivity ? fmtRelative(m.lastActivity) : '—'}</p>
                            <p className="text-[0.6875rem] text-ink-500">Last active</p>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
        </div>
      )}
    </>
  )
}
