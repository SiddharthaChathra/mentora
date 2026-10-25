import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarPlus, Download, Mail, MessageSquarePlus, Phone } from 'lucide-react'
import type { Actor } from '@/server/authz'
import type { DB } from '@/server/supabase'
import { listSubjects, loadStudentAcademics, loadThresholds, pendingCorrectionTargets, toInsightSemesters } from '@/server/services/academics'
import { listRecommendations, listResources, listSessions } from '@/server/services/mentoring'
import { getActiveMentor, getSettings, getStudentProfile, listMentees } from '@/server/services/people'
import { evaluateRisk } from '@/lib/risk'
import { GENDER_LABEL, KIND_LABEL } from '@/lib/labels'
import { fmt2, fmtDate, fmtRelative } from '@/lib/utils'
import { IllustratedScoreCard } from '@/components/ui/display'
import { Avatar } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardBody, CardHeader, DefinitionList, Pill, ProgressBar, StatusPill } from '@/components/ui/primitives'
import { TabLinks } from '@/components/ui/navigation'
import { EmptyState, NotEnoughData } from '@/components/ui/states'
import { SgpaTrend } from '@/components/charts/academic'
import { JourneyTimeline } from '@/components/charts/journey-timeline'
import { SemesterView } from '@/features/academics/semester-view'
import { MentoringWorkspace } from '@/features/mentoring/recommendations'
import { ResourcesWorkspace } from '@/features/mentoring/resources'
import { SessionsWorkspace } from '@/features/mentoring/sessions'
import { MentorCard, SessionCard } from '@/features/mentoring/cards'
import { RiskChip } from '@/features/roster/roster'
import { AnalyticsPanel } from './analytics-panel'
import { buildJourney } from './journey'
import { ProfileFab } from './profile-fab'

const TABS = ['overview', 'academics', 'analytics', 'mentoring', 'resources', 'sessions', 'journey', 'report'] as const
type Tab = (typeof TABS)[number]

export async function StudentProfileView({
  db,
  actor,
  studentId,
  basePath,
  searchParams,
}: {
  db: DB
  actor: Actor
  studentId: string
  basePath: string
  searchParams: Record<string, string | undefined>
}) {
  const profile = await getStudentProfile(db, studentId)
  if (!profile) notFound()
  const isMentor = actor.role === 'MENTOR'
  const tab: Tab = TABS.find((t) => t === searchParams.tab) ?? 'overview'
  const dept = profile.departmentId
  const [mentor, academics, thresholds] = await Promise.all([getActiveMentor(db, studentId), loadStudentAcademics(db, studentId, dept), loadThresholds(db, dept)])
  const flags = evaluateRisk({ createdAt: profile.createdAt, onboardingCompletedAt: profile.onboardingCompletedAt, currentSemester: profile.currentSemester, semesters: toInsightSemesters(academics.semesters) }, thresholds)
  const href = `${basePath}/${studentId}`

  const tabs = [
    { value: 'overview', label: 'Overview', icon: 'overview' as const },
    { value: 'academics', label: 'Academics', icon: 'academics' as const },
    { value: 'analytics', label: 'Analytics & insights', icon: 'analytics' as const },
    { value: 'mentoring', label: 'Mentoring', icon: 'mentoring' as const },
    { value: 'resources', label: 'Resources', icon: 'resources' as const },
    { value: 'sessions', label: 'Sessions', icon: 'sessions' as const },
    { value: 'journey', label: 'Journey', icon: 'journey' as const },
    ...(isMentor || actor.role === 'HOD' ? [{ value: 'report', label: 'Report', icon: 'report' as const }] : []),
  ]

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-ink-500">
        <Link href={basePath} className="font-medium hover:text-ink-900">
          {isMentor ? 'My mentees' : 'Students'}
        </Link>{' '}
        / <span className="text-ink-700">{profile.fullName ?? 'Student'}</span>
      </nav>
      {/* Blue banner header (ref-kouliah) */}
      <section className="relative isolate overflow-hidden rounded-[24px] bg-gradient-banner p-5 text-white shadow-hero sm:p-6">
        <svg aria-hidden viewBox="0 0 800 200" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 -z-10 h-full w-full">
          <path d="M240 230 C380 120 560 90 820 80 L820 120 C580 130 420 160 330 230Z" fill="#FFFFFF" opacity="0.1" />
          <circle cx="740" cy="20" r="110" fill="#FFFFFF" opacity="0.06" />
        </svg>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4 sm:gap-5">
            <span className="rounded-full bg-white p-1 shadow-3">
              <Avatar userId={studentId} name={profile.fullName} hasImage={!!profile.avatarPath} version={profile.avatarPath} size="xl" className="rounded-full" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl leading-tight font-bold tracking-tight !text-white sm:text-[1.75rem]">{profile.fullName ?? 'New student'}</h1>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.usn && <span className="frost num inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold">{profile.usn}</span>}
                {profile.currentSemester && <span className="frost inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold">Semester {profile.currentSemester}</span>}
                {profile.sectionName && <span className="frost inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold">Section {profile.sectionName}</span>}
                <span className="frost inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold">{mentor ? `Mentor: ${mentor.fullName}` : 'No mentor yet'}</span>
                <span className="rounded-full bg-white">
                  <RiskChip flags={flags} />
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isMentor && (
              <>
                <Link href={`${href}?tab=mentoring&action=recommend`} className="frost inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold hover:brightness-125">
                  <MessageSquarePlus className="size-4" /> Recommend
                </Link>
                <Link href={`${href}?tab=sessions&new=1`} className="frost inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold hover:brightness-125">
                  <CalendarPlus className="size-4" /> Schedule
                </Link>
              </>
            )}
            {(isMentor || actor.role === 'HOD') && (
              <a href={`/api/reports/student/${studentId}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-primary-700 hover:bg-primary-50">
                <Download className="size-4" /> Download report
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="sticky top-[88px] z-10 -mx-4 mt-4 px-4 py-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 xl:top-[112px]">
        <TabLinks tabs={tabs} layoutId="profile-tab" />
      </div>

      <div className="pt-6">
        {tab === 'overview' && <OverviewTab db={db} actor={actor} studentId={studentId} profile={profile} mentor={mentor} academics={academics} flags={flags} href={href} />}
        {tab === 'academics' && <AcademicsTab db={db} actor={actor} studentId={studentId} academics={academics} />}
        {tab === 'analytics' && <AnalyticsPanel db={db} studentId={studentId} departmentId={dept} params={searchParams} viewer={actor.role} />}
        {tab === 'mentoring' && <MentoringTab db={db} actor={actor} studentId={studentId} canWrite={isMentor} />}
        {tab === 'resources' && <ResourcesTab db={db} actor={actor} studentId={studentId} href={href} />}
        {tab === 'sessions' && <SessionsTab db={db} actor={actor} studentId={studentId} />}
        {tab === 'journey' && <JourneyTab db={db} actor={actor} studentId={studentId} academics={academics} href={href} />}
        {tab === 'report' && <ReportTab db={db} actor={actor} studentId={studentId} academics={academics} />}
      </div>
      {isMentor && <ProfileFab href={href} />}
    </div>
  )
}

async function OverviewTab({
  db,
  actor,
  studentId,
  profile,
  mentor,
  academics,
  flags,
  href,
}: {
  db: DB
  actor: Actor
  studentId: string
  profile: NonNullable<Awaited<ReturnType<typeof getStudentProfile>>>
  mentor: Awaited<ReturnType<typeof getActiveMentor>>
  academics: Awaited<ReturnType<typeof loadStudentAcademics>>
  flags: ReturnType<typeof evaluateRisk>
  href: string
}) {
  const [recs, sessions, settings] = await Promise.all([listRecommendations(db, studentId, actor.id), listSessions(db, { studentId, from: new Date().toISOString(), limit: 2 }), getSettings(db)])
  const latest = recs.slice(0, 3)
  const open = recs.filter((r) => (r.kind === 'GOAL' || r.kind === 'ACTION_POINT') && r.status !== 'COMPLETED')
  return (
    <div className="stagger grid gap-4 lg:grid-cols-12">
      <IllustratedScoreCard
        className="lg:col-span-4"
        label="CGPA"
              help="CGPA"
        value={academics.cgpa.value?.cgpa ?? null}
        reason={academics.cgpa.reason}
        caption={`${academics.creditsEarned}${settings.programCredits ? ` / ${settings.programCredits}` : ''} credits earned`}
      />
      <div className="lg:col-span-8">
        {academics.semesters.length ? (
          <SgpaTrend semesters={academics.semesters.map((s) => ({ semesterNo: s.semesterNo, sgpa: s.displaySgpa }))} />
        ) : (
          <Card className="h-full">
            <CardBody>
              <NotEnoughData reason="No semesters recorded yet." />
            </CardBody>
          </Card>
        )}
      </div>

      <Card className="lg:col-span-5">
        <CardHeader title="Risk indicators" description="Explained, never scored" />
        <CardBody>
          {flags.length ? (
            <ul className="space-y-3">
              {flags.map((f) => (
                <li key={f.key} className="rounded-[16px] bg-tile-rose px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Pill tone={f.severity === 'high' ? 'danger' : 'warning'} dot>
                      {f.label}
                    </Pill>
                  </div>
                  <p className="mt-1.5 text-sm text-ink-700">{f.reason}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-700">No risk indicators. Recorded data looks healthy.</p>
          )}
        </CardBody>
      </Card>
      <Card className="lg:col-span-7">
        <CardHeader title="Recent mentoring" action={<Link href={`${href}?tab=mentoring`} className="text-sm font-medium text-primary-600 hover:underline">Open</Link>} />
        <CardBody>
          {latest.length ? (
            <ul className="divide-y divide-line/70">
              {latest.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">{r.title}</p>
                    <p className="text-xs text-ink-500">
                      {KIND_LABEL[r.kind]} · {fmtRelative(r.createdAt)}
                      {r.visibility === 'PRIVATE_MENTOR' && ' · private'}
                    </p>
                  </div>
                  <StatusPill status={r.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-500">Nothing recorded yet.</p>
          )}
          <p className="mt-3 text-xs text-ink-500">{open.length} open goal{open.length === 1 ? '' : 's'} / action point{open.length === 1 ? '' : 's'}</p>
        </CardBody>
      </Card>

      <Card className="lg:col-span-7">
        <CardHeader title="Profile" description={`${profile.profileCompletion}% complete${profile.onboardingCompletedAt ? '' : ' · setup not finished'}`} />
        <CardBody>
          <DefinitionList
            items={[
              { label: 'Email', value: <a className="inline-flex items-center gap-1.5 hover:text-primary-700" href={`mailto:${profile.email}`}><Mail className="size-3.5" />{profile.email}</a> },
              { label: 'Phone', value: profile.phone ? <a className="inline-flex items-center gap-1.5 hover:text-primary-700" href={`tel:${profile.phone.replace(/\s/g, '')}`}><Phone className="size-3.5" />{profile.phone}</a> : null },
              { label: 'Program', value: profile.program },
              { label: 'Admission → graduation', value: profile.admissionYear ? `${profile.admissionYear} → ${profile.expectedGraduationYear ?? '?'}` : null },
              ...(profile.gender ? [{ label: 'Gender', value: GENDER_LABEL[profile.gender as keyof typeof GENDER_LABEL] }] : []),
              ...(profile.dob ? [{ label: 'Date of birth', value: fmtDate(profile.dob) }] : []),
              { label: 'Skills', value: profile.skills.length ? <span className="flex flex-wrap gap-1">{profile.skills.map((s) => <Pill key={s} tone="brand">{s}</Pill>)}</span> : null },
              { label: 'Interests', value: profile.interests.join(', ') || null },
              { label: 'Career goals', value: profile.careerGoals },
              { label: 'Achievements', value: profile.achievements },
              { label: 'Wants support with', value: profile.supportAreas },
            ]}
          />
        </CardBody>
      </Card>
      <div className="space-y-4 lg:col-span-5">
        <Card>
          <CardHeader title="Next session" />
          <CardBody>{sessions[0] ? <SessionCard session={sessions[0]} /> : <p className="text-sm text-ink-500">Nothing scheduled.</p>}</CardBody>
        </Card>
        {actor.role === 'HOD' && (
          <>
            <Card>
              <CardHeader title="Mentor" action={<Link href={`/hod/assignments?student=${studentId}`} className="text-sm font-medium text-primary-600 hover:underline">Change</Link>} />
              <CardBody>
                <MentorCard mentor={mentor} />
              </CardBody>
            </Card>
            <AssignmentHistory db={db} studentId={studentId} />
          </>
        )}
      </div>
    </div>
  )
}

async function AssignmentHistory({ db, studentId }: { db: DB; studentId: string }) {
  const { data } = await db.from('mentor_assignments').select('id, mentor_id, started_at, ended_at, reason, end_reason, group_name').eq('student_id', studentId).order('started_at', { ascending: false })
  const ids = [...new Set((data ?? []).map((a) => a.mentor_id))]
  const { data: mentors } = ids.length ? await db.from('mentor_profiles').select('user_id, full_name').in('user_id', ids) : { data: [] }
  const name = new Map((mentors ?? []).map((m) => [m.user_id, m.full_name]))
  return (
    <Card>
      <CardHeader title="Assignment history" description="Kept permanently, including ended assignments" />
      <CardBody>
        {!data?.length ? (
          <p className="text-sm text-ink-500">Never assigned.</p>
        ) : (
          <ol className="space-y-3 border-l border-line pl-4">
            {data.map((a) => (
              <li key={a.id} className="relative text-sm">
                <span className={`absolute top-1.5 -left-[21px] size-2.5 rounded-full ${a.ended_at ? 'bg-ink-400' : 'bg-success-500'}`} />
                <p className="font-medium text-ink-900">
                  {name.get(a.mentor_id) ?? 'Mentor'} {!a.ended_at && <Pill tone="success">Current</Pill>}
                </p>
                <p className="text-xs text-ink-500">
                  {fmtDate(a.started_at)} → {a.ended_at ? fmtDate(a.ended_at) : 'now'}
                  {a.reason ? ` · ${a.reason}` : ''}
                  {a.end_reason ? ` · ended: ${a.end_reason}` : ''}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  )
}

async function AcademicsTab({ db, actor, studentId, academics }: { db: DB; actor: Actor; studentId: string; academics: Awaited<ReturnType<typeof loadStudentAcademics>> }) {
  const [subjects, pending] = await Promise.all([listSubjects(db, actor.departmentId), pendingCorrectionTargets(db, studentId)])
  if (!academics.semesters.length) return <Card><EmptyState illustration="no-marks" title="No academic records yet" description="The student hasn’t added any semesters." /></Card>
  return (
    <div className="space-y-5">
      {pending.length > 0 && (
        <Link href={actor.role === 'MENTOR' ? '/mentor/verifications?tab=corrections' : '#'} className="block rounded-[16px] bg-tile-peach px-4 py-3 text-sm text-accent-700">
          {pending.length} correction request{pending.length === 1 ? '' : 's'} waiting for review →
        </Link>
      )}
      {[...academics.semesters].reverse().map((s) => (
        <SemesterView key={s.id} semester={s} subjects={subjects} scheme={academics.scheme} mode={actor.role === 'MENTOR' ? 'mentor' : actor.role === 'HOD' ? 'hod' : 'readonly'} />
      ))}
    </div>
  )
}

async function MentoringTab({ db, actor, studentId, canWrite }: { db: DB; actor: Actor; studentId: string; canWrite: boolean }) {
  const [items, subjects, settings] = await Promise.all([listRecommendations(db, studentId, actor.id, { withHistory: true }), listSubjects(db, actor.departmentId), getSettings(db)])
  return <MentoringWorkspace items={items} viewer={actor.role} studentId={studentId} subjects={subjects} attendanceEnabled={settings.attendanceEnabled} canWrite={canWrite} />
}

async function ResourcesTab({ db, actor, studentId, href }: { db: DB; actor: Actor; studentId: string; href: string }) {
  const [items, subjects, mentees] = await Promise.all([
    listResources(db, actor.id, { studentId, ...(actor.role === 'MENTOR' ? { mentorId: actor.id } : {}) }),
    listSubjects(db, actor.departmentId),
    actor.role === 'MENTOR' ? listMentees(db, actor.id) : Promise.resolve([]),
  ])
  return <ResourcesWorkspace items={items} viewer={actor.role} subjects={subjects} mentees={mentees.map((m) => ({ id: m.id, name: m.name }))} fixedStudentId={studentId} basePath={`${href}?tab=resources`} />
}

async function SessionsTab({ db, actor, studentId }: { db: DB; actor: Actor; studentId: string }) {
  const sessions = await listSessions(db, { studentId })
  return <SessionsWorkspace sessions={sessions} viewer={actor.role} fixedStudentId={studentId} />
}

async function JourneyTab({ db, actor, studentId, academics, href }: { db: DB; actor: Actor; studentId: string; academics: Awaited<ReturnType<typeof loadStudentAcademics>>; href: string }) {
  const [recs, sessions] = await Promise.all([listRecommendations(db, studentId, actor.id), listSessions(db, { studentId })])
  const events = buildJourney(academics.semesters, recs, sessions, { semester: () => `${href}?tab=academics`, rec: (id) => `${href}?tab=mentoring&item=${id}`, session: (id) => `${href}?tab=sessions&item=${id}` })
  return <JourneyTimeline events={events} />
}

async function ReportTab({ db, actor, studentId, academics }: { db: DB; actor: Actor; studentId: string; academics: Awaited<ReturnType<typeof loadStudentAcademics>> }) {
  const recs = await listRecommendations(db, studentId, actor.id)
  const included = recs.flatMap((r) => [r, ...r.followUps]).filter((r) => r.includeInReport && r.visibility === 'SHARED')
  const verified = academics.semesters.filter((s) => s.status === 'VERIFIED' || s.status === 'FINALIZED')
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card className="overflow-hidden">
        <CardHeader title="Report preview" description="Generated from verified records only. Charts, insights, risk flags and AI text are never included." action={<a href={`/api/reports/student/${studentId}`} className={buttonVariants({ size: 'sm' })}><Download /> Download PDF</a>} />
        <CardBody>
          <iframe title="Student report preview" src={`/api/reports/student/${studentId}?inline=1`} className="h-[72dvh] w-full rounded-lg border border-line bg-surface-muted" />
        </CardBody>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader title="What’s included" />
          <CardBody className="space-y-3 text-sm">
            <p className="text-ink-700">
              <span className="num font-semibold text-ink-900">{verified.length}</span> verified semester{verified.length === 1 ? '' : 's'}
              {academics.semesters.length > verified.length && <span className="text-ink-500"> · {academics.semesters.length - verified.length} unverified excluded</span>}
            </p>
            <p className="text-ink-700">
              <span className="num font-semibold text-ink-900">{included.length}</span> mentoring record{included.length === 1 ? '' : 's'} marked “Include in report”
            </p>
            <p className="text-ink-700">CGPA (verified): <span className="num font-semibold text-ink-900">{fmt2(verified.length ? academics.cgpa.value?.cgpa : null)}</span></p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Mentoring records in report" />
          <CardBody>
            {included.length ? (
              <ul className="space-y-2 text-sm">
                {included.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-2">
                    <span className="text-ink-900">{r.title}</span>
                    <StatusPill status={r.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-500">None selected. Turn on “Include in PDF report” on a recommendation.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
