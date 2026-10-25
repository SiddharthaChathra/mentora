import type { Metadata } from 'next'
import Link from 'next/link'
import { FileWarning, LifeBuoy, ShieldAlert, UserX, Users } from 'lucide-react'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { loadDepartment } from '@/server/services/department'
import { hodNextStep } from '@/server/services/next-step'
import { sectionBars, sectionRanks, sectionSgpa } from '@/server/services/dashboard'
import { firstName, fmtDate } from '@/lib/utils'
import { Greeting3D, HeroStatCard, PastelStatTile } from '@/components/ui/display'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardBody, CardHeader, Pill } from '@/components/ui/primitives'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/states'
import { MentoringConstellation } from '@/components/charts/admin'
import { DonutWithTotal, RankList, StackedRoundedBarChart } from '@/components/charts/dashboard'
import { NextStepCard } from '@/features/dashboard/next-step-card'
import { WorkloadTable } from '@/features/dashboard/widgets'
import { RiskChip } from '@/features/roster/roster'

export const metadata: Metadata = { title: 'Department overview' }

const TILE_SNAP = 'min-w-[80%] snap-start sm:min-w-0'

export default async function HodOverview() {
  const actor = await requireRole('HOD')
  const db = await createClient()
  const [{ roster, mentors }, { data: openFollowups }] = await Promise.all([loadDepartment(db, actor), db.from('intervention_followups').select('student_id').eq('status', 'OPEN')])
  const active = mentors.filter((m) => m.status === 'ACTIVE')
  const invited = mentors.filter((m) => m.status === 'INVITED').length
  const assigned = roster.filter((r) => r.mentorId).length
  const unassigned = roster.length - assigned
  const coverage = roster.length ? Math.round((assigned / roster.length) * 100) : null
  const flagged = roster.filter((r) => r.risk !== 'none').sort((a, b) => (b.risk === 'high' ? 1 : 0) - (a.risk === 'high' ? 1 : 0) || b.flags.length - a.flags.length)
  const high = flagged.filter((r) => r.risk === 'high').length
  const incomplete = roster.filter((r) => !r.onboardingCompletedAt)
  const missingRecords = roster.filter((r) => r.flags.some((f) => f.key === 'MISSING_RESULTS') || !r.hasRecords)
  const byId = new Map(roster.map((r) => [r.id, r]))
  const sections = sectionSgpa(roster)
  const nextStep = hodNextStep({ roster, invited, followupOpen: new Set((openFollowups ?? []).map((f) => f.student_id)) })

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl leading-tight font-semibold tracking-tight text-ink-900 sm:text-[1.75rem]">
            Hello, {firstName(actor.name) || 'there'} <Greeting3D />
          </h1>
          <p className="mt-1 text-base text-ink-500">Your department at a glance: coverage, workload and who needs attention.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/hod/users?invite=1" className={buttonVariants({ variant: 'secondary' })}>
            Invite people
          </Link>
          <Link href="/hod/assignments" className={buttonVariants()}>
            Manage assignments
          </Link>
        </div>
      </header>

      <div className="space-y-5">
        <section className="grid gap-5 lg:grid-cols-12" aria-label="Summary">
          <HeroStatCard
            className="lg:col-span-4"
            label="Mentoring coverage"
            value={coverage}
            suffix="%"
            caption={roster.length ? `${assigned} of ${roster.length} students have a mentor` : undefined}
            emptyText="No students registered yet"
            cta={unassigned ? { label: `Assign ${unassigned} student${unassigned === 1 ? '' : 's'}`, href: '/hod/assignments?filter=unassigned' } : { label: 'Open assignments', href: '/hod/assignments' }}
          />
          <div className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto rounded-[24px] bg-surface p-3 shadow-2 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:p-4 lg:col-span-8 xl:grid-cols-4">
            <PastelStatTile className={TILE_SNAP} label="Students" value={roster.length} tile="blue" icon={<Users />} href="/hod/students" helper={`${roster.filter((r) => r.hasRecords).length} with academic records`} />
            <PastelStatTile className={TILE_SNAP} label="Mentors" value={active.length} tile="lilac" icon={<LifeBuoy />} href="/hod/mentors" helper={invited ? `${invited} invitation${invited === 1 ? '' : 's'} pending` : 'All invitations accepted'} />
            <PastelStatTile className={TILE_SNAP} label="Unassigned" value={unassigned} tile="peach" icon={<UserX />} href="/hod/assignments?filter=unassigned" helper="Students without a mentor" />
            <PastelStatTile className={TILE_SNAP} label="Need intervention" value={flagged.length} tile="rose" icon={<ShieldAlert />} href="/hod/interventions" helper={`${high} high priority`} />
          </div>
        </section>

        <NextStepCard step={nextStep} className="lg:hidden" />

        <section className="grid gap-5 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8">
            <StackedRoundedBarChart
              title="SGPA by section"
              description="Average of each student’s previous and latest SGPA. Select a section to see its students."
              series={[
                { key: 'prev', label: 'Previous sem', color: 'var(--chart-3)' },
                { key: 'latest', label: 'Latest sem', color: 'var(--chart-1)' },
              ]}
              rows={sectionBars(sections)}
              max={10}
              unit=""
              decimals={2}
              empty="Appears once students have an SGPA."
            />
          </div>
          <div className="min-w-0 lg:col-span-4">
            <DonutWithTotal
              title="Risk overview"
              description="Students by their highest risk level"
              totalLabel="Students"
              views={[
                {
                  key: 'all',
                  label: 'All',
                  slices: [
                    { key: 'none', label: 'On track', value: roster.length - flagged.length, color: 'var(--chart-2)', href: '/hod/students?risk=none' },
                    { key: 'medium', label: 'Watch', value: flagged.length - high, color: 'var(--chart-4)', href: '/hod/interventions' },
                    { key: 'high', label: 'High priority', value: high, color: 'var(--danger-500)', href: '/hod/students?risk=high' },
                  ].filter((s) => s.value > 0),
                },
              ]}
            />
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8">
            <WorkloadTable
              rows={active.map((m) => ({
                id: m.id,
                name: m.name ?? m.email,
                email: m.email,
                hasAvatar: !!m.avatarPath,
                mentees: m.mentees.length,
                capacity: m.capacity,
                flagged: m.mentees.filter((id) => (byId.get(id)?.risk ?? 'none') !== 'none').length,
                activity: m.activity30,
              }))}
            />
          </div>
          <div className="min-w-0 space-y-5 lg:col-span-4">
            <NextStepCard step={nextStep} className="hidden lg:flex" />
            <RankList
              title="Most improved sections"
              description="Change in average SGPA, previous → latest semester"
              items={sectionRanks(sections)}
              empty={<p className="text-sm text-ink-500">Needs two semesters of SGPA in a section.</p>}
            />
          </div>
        </section>

        <MentoringConstellation
          hodName={actor.name ?? 'HOD'}
          unassigned={unassigned}
          mentors={active.map((m) => ({
            id: m.id,
            name: m.name ?? m.email,
            mentees: m.mentees.map((id) => ({ id, name: byId.get(id)?.name ?? 'Student', risk: byId.get(id)?.risk ?? 'none' })),
          }))}
        />

        <section className="grid gap-5 lg:grid-cols-3 [&>*]:min-w-0">
          <Card>
            <CardHeader
              title="Flagged for intervention"
              icon={<ShieldAlert />}
              action={
                <Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} href="/hod/interventions">
                  All
                </Link>
              }
            />
            <CardBody>
              {flagged.length === 0 ? (
                <EmptyState compact illustration="success" title="Nobody is flagged" description="Every student is on track." />
              ) : (
                <ul className="space-y-1">
                  {flagged.slice(0, 6).map((r) => (
                    <li key={r.id} className="relative flex items-center gap-3 rounded-[14px] px-2 py-2 hover:bg-surface-muted">
                      <Avatar userId={r.id} name={r.name} hasImage={!!r.avatarPath} size="xs" />
                      <Link href={`/hod/students/${r.id}`} className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900 after:absolute after:inset-0">
                        {r.name}
                      </Link>
                      <span className="relative z-[1]">
                        <RiskChip flags={r.flags} compact />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Incomplete profiles" icon={<UserX />} description={`${incomplete.length} haven’t finished setup`} />
            <CardBody>
              <ul className="space-y-1 text-sm">
                {incomplete.slice(0, 6).map((r) => (
                  <li key={r.id} className="relative flex items-center justify-between gap-3 rounded-[14px] px-2 py-2 hover:bg-surface-muted">
                    <Link href={`/hod/students/${r.id}`} className="truncate font-semibold text-ink-900 after:absolute after:inset-0">
                      {r.name ?? 'New student'}
                    </Link>
                    <span className="num shrink-0 text-xs text-ink-500">
                      {r.profileCompletion}% · since {fmtDate(r.createdAt, 'd MMM')}
                    </span>
                  </li>
                ))}
                {incomplete.length === 0 && <li className="px-2 text-ink-500">Everyone has completed setup.</li>}
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Missing academic records" icon={<FileWarning />} description={`${missingRecords.length} student${missingRecords.length === 1 ? '' : 's'}`} />
            <CardBody>
              <ul className="space-y-1 text-sm">
                {missingRecords.slice(0, 6).map((r) => (
                  <li key={r.id} className="relative flex items-center justify-between gap-3 rounded-[14px] px-2 py-2 hover:bg-surface-muted">
                    <Link href={`/hod/students/${r.id}`} className="truncate font-semibold text-ink-900 after:absolute after:inset-0">
                      {r.name ?? 'New student'}
                    </Link>
                    <Pill tone="accent">{r.hasRecords ? (r.flags.find((f) => f.key === 'MISSING_RESULTS')?.reason.replace('No results recorded for ', '') ?? 'Missing') : 'No records'}</Pill>
                  </li>
                ))}
                {missingRecords.length === 0 && <li className="px-2 text-ink-500">All students have current records.</li>}
              </ul>
            </CardBody>
          </Card>
        </section>
      </div>
    </>
  )
}
