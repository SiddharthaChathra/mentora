import type { Metadata } from 'next'
import Link from 'next/link'
import { endOfWeek, startOfMonth, startOfWeek } from 'date-fns'
import { AlertTriangle, CalendarDays, ClipboardCheck } from 'lucide-react'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { listMentees } from '@/server/services/people'
import { loadRoster, slim } from '@/server/services/roster'
import { listSessions } from '@/server/services/mentoring'
import { mentorNextStep } from '@/server/services/next-step'
import { cohortSgpa, mostImproved, recentResults, subjectPerformance } from '@/server/services/dashboard'
import { firstName, fmtDate } from '@/lib/utils'
import { Greeting3D, HeroStatCard, PastelStatTile } from '@/components/ui/display'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardBody, CardHeader, Pill } from '@/components/ui/primitives'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/states'
import { DonutWithTotal, RankList, ScheduleCards, StackedRoundedBarChart, type DonutSlice } from '@/components/charts/dashboard'
import { NextStepCard } from '@/features/dashboard/next-step-card'
import { RecentResultsTable } from '@/features/dashboard/widgets'
import { MenteeCard, RiskChip } from '@/features/roster/roster'

export const metadata: Metadata = { title: 'Overview' }

const REC_SLICES = [
  { key: 'COMPLETED', label: 'Completed', color: 'var(--chart-2)' },
  { key: 'IN_PROGRESS', label: 'In progress', color: 'var(--chart-1)' },
  { key: 'PENDING', label: 'Pending', color: 'var(--chart-4)' },
] as const

const TILE_SNAP = 'min-w-[80%] snap-start sm:min-w-0'

export default async function MentorOverview() {
  const actor = await requireRole('MENTOR')
  const db = await createClient()
  const mentees = await listMentees(db, actor.id)
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const [roster, sessions, { count: pendingCr }, { data: followups }, { data: recs }] = await Promise.all([
    loadRoster(db, mentees.map((m) => m.id), actor.departmentId),
    listSessions(db, { mentorId: actor.id, from: new Date(now.getTime() - 3600_000).toISOString(), limit: 12, order: 'asc' }),
    db.from('record_change_requests').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
    db.from('intervention_followups').select('id, student_id, note, created_at').eq('mentor_id', actor.id).eq('status', 'OPEN'),
    db.from('mentor_recommendations').select('status, created_at').eq('mentor_id', actor.id).limit(2000),
  ])
  const attention = roster.filter((r) => r.risk !== 'none').sort((a, b) => (a.risk === 'high' ? -1 : 0) - (b.risk === 'high' ? -1 : 0) || b.flags.length - a.flags.length)
  const topReason = attention[0]?.flags[0]?.reason
  const overdue = roster.reduce((n, r) => n + r.openFollowUps, 0)
  const pendingFollow = overdue + (followups?.length ?? 0)
  const toVerify = roster.reduce((n, r) => n + r.submittedCount, 0)
  const upcoming = sessions.filter((s) => s.status === 'SCHEDULED')
  const thisWeek = upcoming.filter((s) => new Date(s.scheduledAt) >= weekStart && new Date(s.scheduledAt) <= weekEnd)
  const byId = new Map(roster.map((r) => [r.id, r]))
  const sgpa = cohortSgpa(roster)
  const nextStep = mentorNextStep({ toVerify, corrections: pendingCr ?? 0, roster })

  const monthStart = startOfMonth(now).toISOString()
  const slicesFor = (rows: { status: string; created_at: string }[]): DonutSlice[] =>
    REC_SLICES.map((s) => ({ ...s, value: rows.filter((r) => r.status === s.key).length, href: `/mentor/recommendations?status=${s.key}` })).filter((s) => s.value > 0)

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl leading-tight font-semibold tracking-tight text-ink-900 sm:text-[1.75rem]">
            Hello, {firstName(actor.name) || 'there'} <Greeting3D />
          </h1>
          <p className="mt-1 text-base text-ink-500">
            {roster.length} mentee{roster.length === 1 ? '' : 's'} assigned to you
            {attention.length ? ` · ${attention.length} need${attention.length === 1 ? 's' : ''} attention` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/mentor/sessions?new=1" className={buttonVariants({ variant: 'secondary' })}>
            Schedule session
          </Link>
          <Link href="/mentor/mentees?action=recommend" className={buttonVariants()}>
            Write recommendation
          </Link>
        </div>
      </header>

      <div className="space-y-5">
        <section className="grid gap-5 lg:grid-cols-12" aria-label="Summary">
          <HeroStatCard
            className="lg:col-span-4"
            label="Average SGPA of my mentees"
            value={sgpa.avg}
            decimals={2}
            delta={sgpa.delta == null ? null : { value: sgpa.delta, label: 'vs previous sem' }}
            caption={sgpa.students ? `${sgpa.students} with an SGPA` : undefined}
            emptyText="No SGPA data yet"
            cta={{ label: 'Review mentees', href: '/mentor/mentees' }}
          />
          <div className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto rounded-[24px] bg-surface p-3 shadow-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:p-4 lg:col-span-8">
            <PastelStatTile className={TILE_SNAP} label="Needs attention" value={attention.length} tile="rose" icon={<AlertTriangle />} href="/mentor/mentees?risk=flagged" helper={topReason ? `Top reason: ${topReason}` : 'No risk indicators'} />
            <PastelStatTile className={TILE_SNAP} label="Pending follow-ups" value={pendingFollow} tile="peach" icon={<ClipboardCheck />} href="/mentor/recommendations?status=due" helper={`${toVerify} semester${toVerify === 1 ? '' : 's'} to verify`} />
            <PastelStatTile
              className={TILE_SNAP}
              label="Sessions this week"
              value={thisWeek.length}
              tile="green"
              icon={<CalendarDays />}
              href="/mentor/sessions"
              helper={upcoming[0] ? `Next ${fmtDate(upcoming[0].scheduledAt, 'EEE h:mm a')}` : 'Nothing scheduled'}
            />
          </div>
        </section>

        <NextStepCard step={nextStep} className="lg:hidden" />

        <section className="grid gap-5 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8">
            <StackedRoundedBarChart
              title="Subject performance overview"
              description="Average MSE % and SEE % across your mentees. Select a subject to see who took it."
              series={[
                { key: 'mse', label: 'MSE %', color: 'var(--chart-1)' },
                { key: 'see', label: 'SEE %', color: 'var(--chart-3)' },
              ]}
              rows={subjectPerformance(roster, '/mentor/mentees')}
              empty="Needs marks from at least two students per subject."
            />
          </div>
          <div className="min-w-0 lg:col-span-4">
            <DonutWithTotal
              title="Recommendation summary"
              description="Goals, action points and advice you’ve written"
              views={[
                { key: 'all', label: 'All time', slices: slicesFor(recs ?? []) },
                { key: 'month', label: 'This month', slices: slicesFor((recs ?? []).filter((r) => r.created_at >= monthStart)) },
              ]}
            />
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8">
            <RecentResultsTable rows={recentResults(roster, '/mentor/mentees')} seeMore="/mentor/verifications" />
          </div>
          <div className="min-w-0 space-y-5 lg:col-span-4">
            <NextStepCard step={nextStep} className="hidden lg:flex" />
            <RankList
              title="Most improved"
              description="Biggest SGPA gain between the last two semesters"
              items={mostImproved(roster, '/mentor/mentees')}
              empty={<p className="text-sm text-ink-500">No improvements to show yet — this needs two semesters with an SGPA.</p>}
            />
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-12">
          <Card className="min-w-0 lg:col-span-7">
            <CardHeader
              title="Needs attention"
              description="Every flag explains its reason."
              action={
                attention.length > 6 && (
                  <Link href="/mentor/mentees?risk=flagged" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                    See all
                  </Link>
                )
              }
            />
            <CardBody>
              {attention.length === 0 ? (
                <EmptyState compact illustration="success" title="Everyone is on track" description="No risk indicators across your mentees right now." />
              ) : (
                <ul className="space-y-1">
                  {attention.slice(0, 6).map((r) => (
                    <li key={r.id} className="relative flex items-center gap-3 rounded-[14px] px-2 py-2.5 hover:bg-surface-muted">
                      <Avatar userId={r.id} name={r.name} hasImage={!!r.avatarPath} size="sm" />
                      <div className="min-w-0 flex-1">
                        <Link href={`/mentor/mentees/${r.id}`} className="block truncate font-semibold text-ink-900 after:absolute after:inset-0">
                          {r.name}
                        </Link>
                        <p className="truncate text-xs text-ink-500">{r.flags.map((f) => f.reason).join(' · ')}</p>
                      </div>
                      <span className="relative z-[1]">
                        <RiskChip flags={r.flags} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
          <Card className="min-w-0 lg:col-span-5">
            <CardHeader
              title="Upcoming sessions"
              action={
                <Link href="/mentor/sessions" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                  Calendar
                </Link>
              }
            />
            <CardBody>
              <ScheduleCards
                items={upcoming.slice(0, 4).map((s) => ({ id: s.id, kind: 'session', date: s.scheduledAt, title: s.agenda || 'Mentoring session', sub: s.studentName ?? s.groupName ?? undefined, href: `/mentor/sessions?item=${s.id}` }))}
                empty={<EmptyState compact illustration="no-sessions" title="No sessions coming up" description="Schedule a check-in with a mentee or your whole group." />}
              />
            </CardBody>
          </Card>
        </section>

        {(followups?.length ?? 0) > 0 && (
          <Card>
            <CardHeader title="Follow-ups requested by your HOD" />
            <CardBody>
              <ul className="space-y-2">
                {followups!.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center gap-3 rounded-[16px] bg-tile-peach px-4 py-3 text-sm">
                    <Pill tone="accent">Open</Pill>
                    <Link href={`/mentor/mentees/${f.student_id}`} className="font-semibold text-ink-900 hover:underline">
                      {byId.get(f.student_id)?.name ?? 'Student'}
                    </Link>
                    <span className="text-ink-700">{f.note}</span>
                    <span className="ml-auto text-xs text-ink-500">{fmtDate(f.created_at, 'd MMM')}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}

        <section aria-labelledby="mentees-h">
          <div className="mb-4 flex items-end justify-between">
            <h2 id="mentees-h" className="text-xl font-semibold text-ink-900">
              Your mentees
            </h2>
            <Link href="/mentor/mentees" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
              Search & filter
            </Link>
          </div>
          {roster.length === 0 ? (
            <Card>
              <EmptyState illustration="no-mentees" title="No mentees yet" description="Your HOD hasn’t assigned students to you. You’ll get a notification when they do." />
            </Card>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {roster.slice(0, 6).map((m) => (
                <li key={m.id}>
                  <MenteeCard m={slim(m)} href={`/mentor/mentees/${m.id}`} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
