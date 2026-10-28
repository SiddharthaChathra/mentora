import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { loadDepartment } from '@/server/services/department'
import { getSemesterScope } from '@/server/scope'
import { ScopeChip } from '@/components/shell/scope-chip'
import { fmtRelative } from '@/lib/utils'
import { PageHeader } from '@/components/ui/page-header'
import { Avatar } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { Card, Pill, ProgressBar, StatusPill } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/states'
import { DirectoryToolbar } from '@/features/roster/directory-toolbar'

export const metadata: Metadata = { title: 'Mentors' }

export default async function HodMentorsPage({ searchParams }: { searchParams: Promise<{ q?: string; load?: string; status?: string }> }) {
  const actor = await requireRole('HOD')
  const sp = await searchParams
  const db = await createClient()
  const scope = await getSemesterScope()
  const { mentors, roster } = await loadDepartment(db, actor, scope)
  const riskBy = new Map(roster.map((r) => [r.id, r.risk]))
  const q = sp.q?.toLowerCase()
  const shown = mentors.filter(
    (m) =>
      (!q || `${m.name} ${m.email} ${m.facultyId} ${m.expertise.join(' ')}`.toLowerCase().includes(q)) &&
      (!sp.status || sp.status === 'all' || m.status === sp.status) &&
      (!sp.load || sp.load === 'all' || (sp.load === 'over' ? m.mentees.length > m.capacity : sp.load === 'none' ? m.mentees.length === 0 : m.mentees.length <= m.capacity && m.mentees.length > 0)),
  )
  return (
    <>
      <PageHeader
        title="Mentor"
        accent="directory"
        description="Workload, activity and coverage for every mentor in your branch."
        actions={
          <Link href="/hod/users?invite=1&role=MENTOR" className={buttonVariants()}>
            Invite mentor
          </Link>
        }
      />
      <ScopeChip scope={scope} />
      <DirectoryToolbar
        storageKey="m_hod_mentor_filters"
        searchPlaceholder="Search name, faculty ID or expertise…"
        filters={[
          { param: 'load', label: 'Workload', options: [{ value: 'all', label: 'Any workload' }, { value: 'ok', label: 'Within capacity' }, { value: 'over', label: 'Over capacity' }, { value: 'none', label: 'No mentees' }] },
          { param: 'status', label: 'Account', options: [{ value: 'all', label: 'Any account' }, { value: 'ACTIVE', label: 'Active' }, { value: 'INVITED', label: 'Invited' }, { value: 'SUSPENDED', label: 'Suspended' }] },
        ]}
      />
      {shown.length === 0 ? (
        <Card>
          <EmptyState illustration={mentors.length ? 'no-results' : 'no-mentees'} title={mentors.length ? 'No mentors match' : 'No mentors yet'} description={mentors.length ? 'Try another search.' : 'Invite faculty members to become mentors.'} />
        </Card>
      ) : (
        <ul className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((m) => {
            const flagged = m.mentees.filter((id) => riskBy.get(id) && riskBy.get(id) !== 'none').length
            const over = m.mentees.length > m.capacity
            return (
              <li key={m.id}>
                <Link href={`/hod/mentors/${m.id}`} className="block h-full rounded-xl bg-surface p-5 shadow-2 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-3">
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
                    <ProgressBar value={m.mentees.length} max={m.capacity} tone={over ? 'danger' : 'brand'} label={`${m.name} workload`} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {m.expertise.slice(0, 3).map((e) => (
                      <Pill key={e} tone="brand">
                        {e}
                      </Pill>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line/70 pt-3 text-center">
                    <div>
                      <p className="num-display text-lg font-semibold text-ink-900">{m.activity30}</p>
                      <p className="text-[0.6875rem] text-ink-500">Actions · 30d</p>
                    </div>
                    <div>
                      <p className={`num-display text-lg font-semibold ${flagged ? 'text-danger-700' : 'text-ink-900'}`}>{flagged}</p>
                      <p className="text-[0.6875rem] text-ink-500">Flagged</p>
                    </div>
                    <div>
                      <p className="truncate text-sm font-medium text-ink-900">{m.lastActivity ? fmtRelative(m.lastActivity) : '—'}</p>
                      <p className="text-[0.6875rem] text-ink-500">Last active</p>
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
