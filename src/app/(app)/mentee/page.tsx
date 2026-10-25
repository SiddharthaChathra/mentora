import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { getSemesterScope } from '@/server/scope'
import { loadStudentAcademics } from '@/server/services/academics'
import { listRecommendations, listResources, listSessions } from '@/server/services/mentoring'
import { getActiveMentor, getSettings, getStudentProfile } from '@/server/services/people'
import { menteeNextStep } from '@/server/services/next-step'
import { KIND_LABEL } from '@/lib/labels'
import { firstName, fmt2, fmtRelative } from '@/lib/utils'
import { Greeting3D, IllustratedScoreCard, StatBanner } from '@/components/ui/display'
import { Avatar } from '@/components/ui/avatar'
import { Card, CardBody, CardHeader, NewDot, Pill, StatusPill } from '@/components/ui/primitives'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'
import { SgpaTrend } from '@/components/charts/academic'
import { MiniCalendar, ScheduleCards, type ScheduleItem } from '@/components/charts/dashboard'
import { NextStepCard } from '@/features/dashboard/next-step-card'
import { ResourceTile } from '@/features/mentoring/cards'

export const metadata: Metadata = { title: 'Overview' }
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()

export default async function MenteeOverview() {
  const actor = await requireRole('MENTEE')
  const db = await createClient()
  const [profile, academics, mentor, recs, resources, sessions, settings, scope] = await Promise.all([
    getStudentProfile(db, actor.id),
    loadStudentAcademics(db, actor.id, actor.departmentId),
    getActiveMentor(db, actor.id),
    listRecommendations(db, actor.id, actor.id),
    listResources(db, actor.id, { studentId: actor.id, limit: 8 }),
    listSessions(db, { studentId: actor.id, from: hoursAgo(24), limit: 6 }),
    getSettings(db),
    getSemesterScope(),
  ])
  const all = recs.flatMap((r) => [r, ...r.followUps])
  const feedback = recs.filter((r) =>
    ['FEEDBACK', 'RECOMMENDATION', 'STRENGTH', 'IMPROVEMENT_AREA'].includes(r.kind),
  )
  const latest = feedback[0]
  const goals = all.filter((r) => r.kind === 'GOAL' || r.kind === 'ACTION_POINT')
  const goalsDone = goals.filter((g) => g.status === 'COMPLETED').length
  const sem =
    (scope ? academics.semesters.find((s) => s.semesterNo === scope) : null) ?? academics.semesters.at(-1)
  const subjectsCleared = sem ? sem.results.filter((r) => r.derivedResult === 'PASS').length : 0
  const subjectsTotal = sem?.results.length ?? 0
  const pending = sem ? sem.results.filter((r) => r.derivedResult === 'PENDING').length : 0
  const sgpaPoints = academics.semesters
    .filter((s) => !scope || s.semesterNo <= scope)
    .map((s) => ({ semesterNo: s.semesterNo, sgpa: s.displaySgpa }))
  const withSgpa = academics.semesters.filter((s) => s.displaySgpa != null)
  const best = withSgpa.reduce<(typeof withSgpa)[number] | null>(
    (a, b) => (!a || b.displaySgpa! > a.displaySgpa! ? b : a),
    null,
  )
  const credits = settings.programCredits
  const openGoals = goals.length - goalsDone
  const nextStep = menteeNextStep({
    onboardingComplete: !!profile?.onboardingCompletedAt,
    currentSemester: profile?.currentSemester ?? null,
    semesters: academics.semesters,
    recs,
  })
  const upcoming = sessions.filter((s) => s.status === 'SCHEDULED')
  const today = new Date().toISOString().slice(0, 10)
  const schedule: ScheduleItem[] = [
    ...upcoming.map((s) => ({
      id: s.id,
      kind: 'session' as const,
      date: s.scheduledAt,
      title: s.agenda || 'Mentoring session',
      sub: s.mentorName ?? undefined,
      href: `/mentee/sessions?item=${s.id}`,
    })),
    ...goals
      .filter((g) => g.status !== 'COMPLETED' && g.dueDate && g.dueDate >= today)
      .map((g) => ({
        id: g.id,
        kind: 'goal' as const,
        date: `${g.dueDate}T09:00:00`,
        title: g.title,
        href: `/mentee/mentoring?item=${g.id}`,
      })),
  ]
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    .slice(0, 4)
  const unseen = feedback.filter((f) => !f.seen).length

  return (
    <>
      <header className="mb-6">
        <h1 className="text-ink-900 flex items-center gap-2 text-2xl leading-tight font-semibold tracking-tight sm:text-[1.75rem]">
          Hello, {firstName(profile?.fullName) || 'there'} <Greeting3D />
        </h1>
        <p className="text-ink-500 mt-1 text-base">Here’s how your semester is going.</p>
      </header>

      <div className="2xl:grid 2xl:grid-cols-[minmax(0,1fr)_340px] 2xl:gap-6">
        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-ink-900 text-xl font-semibold">Summary Report</h2>
            <Pill tone="outline" size="md">
              {sem ? `Semester ${sem.semesterNo} · ${sem.academicYear}` : 'No semester yet'}
            </Pill>
          </div>

          <StatBanner
            stats={[
              {
                icon: 'credits',
                label: 'Credits earned',
                value: credits ? `${academics.creditsEarned} / ${credits}` : academics.creditsEarned,
                pct: credits ? (academics.creditsEarned / credits) * 100 : null,
                helper: academics.creditsInProgress
                  ? `${academics.creditsInProgress} more credits in progress`
                  : academics.creditsEarned
                    ? 'Keep the streak going'
                    : 'Add a semester to start counting',
                href: '/mentee/academics',
              },
              {
                icon: 'goals',
                label: 'Goals completed',
                value: `${goalsDone} / ${goals.length}`,
                pct: goals.length ? (goalsDone / goals.length) * 100 : null,
                helper: goals.length
                  ? openGoals
                    ? `${openGoals} more goal${openGoals === 1 ? '' : 's'} to finish`
                    : 'Every goal is done. Nice!'
                  : 'Your mentor will set goals with you',
                href: '/mentee/mentoring?tab=plan',
              },
              {
                icon: 'subjects',
                label: sem ? `Subjects · Sem ${sem.semesterNo}` : 'Subjects this semester',
                value: `${subjectsCleared} / ${subjectsTotal}`,
                pct: subjectsTotal ? (subjectsCleared / subjectsTotal) * 100 : null,
                helper: pending
                  ? `${pending} result${pending === 1 ? '' : 's'} still pending`
                  : subjectsTotal
                    ? 'All results recorded'
                    : 'Add subjects for this semester',
                href: sem ? `/mentee/academics/${sem.semesterNo}` : '/mentee/academics?new=1',
              },
            ]}
          />

          <div className="grid gap-5 lg:grid-cols-12">
            <div className="lg:col-span-8">
              {academics.semesters.length === 0 ? (
                <Card className="h-full">
                  <EmptyState
                    illustration="no-marks"
                    title="No marks yet"
                    description="Add your first semester to see your SGPA records."
                    action={
                      <Link href="/mentee/academics?new=1" className={buttonVariants()}>
                        Add a semester
                      </Link>
                    }
                  />
                </Card>
              ) : (
                <SgpaTrend
                  semesters={sgpaPoints}
                  action={
                    <Link
                      href="/mentee/analytics"
                      className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                    >
                      See More
                    </Link>
                  }
                />
              )}
            </div>
            <IllustratedScoreCard
              className="lg:col-span-4"
              label="CGPA"
              help="CGPA"
              value={academics.cgpa.value?.cgpa ?? null}
              reason={academics.cgpa.reason}
              caption={
                academics.cgpa.value
                  ? `Across ${academics.cgpa.value.includedSemesters.length} semester${academics.cgpa.value.includedSemesters.length === 1 ? '' : 's'} · ${academics.cgpa.value.credits} credits${best ? ` · Best: Sem ${best.semesterNo} (${fmt2(best.displaySgpa)})` : ''}`
                  : undefined
              }
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-12">
            <Card className="lg:col-span-7">
              <CardHeader
                title="From your mentor"
                action={
                  <Link
                    href="/mentee/mentoring"
                    className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                  >
                    View all{' '}
                    {unseen > 0 && (
                      <span className="num bg-danger-500 rounded-full px-1.5 text-[0.6875rem] text-white">
                        {unseen}
                      </span>
                    )}
                  </Link>
                }
              />
              <CardBody>
                {latest ? (
                  <Link
                    href={`/mentee/mentoring?item=${latest.id}`}
                    className="group bg-surface-muted hover:bg-primary-50 block rounded-[20px] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        userId={latest.mentorId}
                        name={latest.mentorName}
                        hasImage={latest.mentorHasAvatar}
                        size="sm"
                        className="rounded-full"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-ink-900 truncate text-sm font-semibold">{latest.mentorName}</p>
                        <p className="text-ink-500 text-xs">
                          {KIND_LABEL[latest.kind]} · {fmtRelative(latest.createdAt)}
                        </p>
                      </div>
                      {!latest.seen && <NewDot />}
                    </div>
                    <p className="text-ink-900 group-hover:text-primary-700 mt-3 text-base font-semibold">
                      {latest.title}
                    </p>
                    <p className="text-ink-700 mt-1 line-clamp-2 text-sm">{latest.body}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <StatusPill status={latest.status} />
                      {latest.subject && <Pill tone="outline">{latest.subject.code}</Pill>}
                    </div>
                  </Link>
                ) : (
                  <EmptyState
                    compact
                    illustration="no-feedback"
                    title="No feedback yet"
                    description={
                      mentor
                        ? `${mentor.fullName} hasn’t shared anything yet.`
                        : 'You’ll see feedback once a mentor is assigned.'
                    }
                  />
                )}
              </CardBody>
            </Card>
            <NextStepCard step={nextStep} className="lg:col-span-5" />
          </div>

          <Card className="overflow-hidden">
            <CardHeader
              title="New resources"
              action={
                <Link
                  href="/mentee/resources"
                  className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                >
                  See More
                </Link>
              }
            />
            <CardBody>
              {resources.length ? (
                <ul className="-mx-5 flex snap-x scrollbar-none gap-3 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6">
                  {resources.map((r) => (
                    <li key={r.id} className="w-64 shrink-0 snap-start">
                      <ResourceTile r={r} href={`/mentee/resources?item=${r.id}`} />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  compact
                  illustration="no-resources"
                  title="No resources yet"
                  description="Notes and study material from your mentor will show up here."
                />
              )}
            </CardBody>
          </Card>
        </div>

        <aside
          className="mt-5 grid gap-5 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)] 2xl:mt-0 2xl:block 2xl:space-y-4"
          aria-label="Calendar and schedule"
        >
          <MiniCalendar
            marked={[
              ...upcoming.map((s) => s.scheduledAt),
              ...goals.filter((g) => g.dueDate).map((g) => g.dueDate!),
            ]}
            selected={upcoming[0] ? new Date(upcoming[0].scheduledAt) : undefined}
          />
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <h2 className="text-ink-900 text-lg font-semibold">Schedule</h2>
              <Link
                href="/mentee/sessions"
                className="text-primary-600 text-sm font-semibold hover:underline"
              >
                All sessions
              </Link>
            </div>
            <ScheduleCards
              items={schedule}
              empty={
                <p className="bg-surface text-ink-500 shadow-2 rounded-[20px] p-5 text-sm">
                  Nothing scheduled. Your mentor will set up your next session.
                </p>
              }
            />
          </div>
        </aside>
      </div>
    </>
  )
}
