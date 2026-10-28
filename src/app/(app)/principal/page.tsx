import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeftRight, Building2, Crown, LifeBuoy, ShieldAlert, UserX, Users } from 'lucide-react'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { getSemesterScope } from '@/server/scope'
import { branchHealth, listBranches, loadCollegeDigest, principalBranch } from '@/server/services/branches'
import { firstName } from '@/lib/utils'
import { ScopeChip } from '@/components/shell/scope-chip'
import { Greeting3D, HeroStatCard, PastelStatTile } from '@/components/ui/display'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardBody, CardHeader, Pill } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/states'
import { DonutWithTotal } from '@/components/charts/dashboard'
import { BranchOverview } from '@/features/branch/overview'
import { ReadOnlyBanner } from '@/features/principal/read-only-banner'
import { BranchComparison, BranchHealthTable, type BranchHealthRow } from '@/features/principal/overview-widgets'

export const metadata: Metadata = { title: 'College overview' }

const TILE_SNAP = 'min-w-[80%] snap-start sm:min-w-0'
const LOW_COVERAGE = 80
const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)', 'var(--chart-7)']

export default async function PrincipalOverview({ searchParams }: { searchParams: Promise<{ branch?: string }> }) {
  const actor = await requireRole('PRINCIPAL')
  const db = await createClient()
  const sp = await searchParams
  const selected = await principalBranch(db, sp.branch)

  // Branch switcher narrowed to one branch: the HOD overview of that branch, read-only.
  if (selected) {
    return (
      <>
        <ReadOnlyBanner />
        <BranchOverview
          actor={actor}
          departmentId={selected.id}
          readOnly
          intro={`${selected.code} · ${selected.name}${selected.headName ? ` · HOD ${selected.headName}` : ' · No HOD appointed'}`}
          links={{
            students: `/principal/students?branch=${selected.code}`,
            mentors: `/principal/mentors?branch=${selected.code}`,
            interventions: `/principal/interventions?branch=${selected.code}`,
            assignments: null,
            student: (id) => `/principal/students/${id}`,
          }}
        />
      </>
    )
  }

  const scope = await getSemesterScope()
  const branches = await listBranches(db)
  const [parts, { count: pendingTransfers }] = await Promise.all([
    loadCollegeDigest(db, branches, scope),
    db.from('student_branch_transfers').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
  ])
  const rows: BranchHealthRow[] = parts.map((p) => ({ id: p.branch.id, code: p.branch.code, name: p.branch.name, headName: p.branch.headName, ...branchHealth(p) }))
  const total = rows.reduce((a, r) => a + r.students, 0)
  const assigned = parts.reduce((a, p) => a + p.roster.filter((r) => r.mentorId).length, 0)
  const flagged = rows.reduce((a, r) => a + r.flagged, 0)
  const coverage = total ? Math.round((assigned / total) * 100) : null
  const noHod = branches.filter((b) => !b.headId)
  const lowCoverage = rows.filter((r) => r.students > 0 && (r.coverage ?? 0) < LOW_COVERAGE)

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl leading-tight font-semibold tracking-tight text-ink-900 sm:text-[1.75rem]">
            Hello, {firstName(actor.name) || 'there'} <Greeting3D />
          </h1>
          <p className="mt-1 text-base text-ink-500">The whole college at a glance: every branch, its coverage and who needs attention.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/principal/hods" className={buttonVariants({ variant: 'secondary' })}>
            Appoint HODs
          </Link>
          <Link href="/principal/students" className={buttonVariants()}>
            Students by branch
          </Link>
        </div>
      </header>
      <ScopeChip scope={scope} />

      <div className="space-y-5">
        <section className="grid gap-5 lg:grid-cols-12" aria-label="Summary">
          <HeroStatCard
            className="min-w-0 lg:col-span-4"
            label="College mentoring coverage"
            value={coverage}
            suffix="%"
            caption={total ? `${assigned} of ${total} students have a mentor` : undefined}
            emptyText="No students registered yet"
            cta={{ label: 'See branches', href: '/principal/branches' }}
          />
          <div className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto rounded-[24px] bg-surface p-3 shadow-2 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:p-4 lg:col-span-8 xl:grid-cols-3">
            <PastelStatTile className={TILE_SNAP} label="Branches" value={branches.length} tile="blue" icon={<Building2 />} href="/principal/branches" helper={noHod.length ? `${noHod.length} without an HOD` : 'Every branch has an HOD'} />
            <PastelStatTile className={TILE_SNAP} label="Students" value={total} tile="green" icon={<Users />} href="/principal/students" helper={`${rows.filter((r) => r.students).length} branches with students`} />
            <PastelStatTile className={TILE_SNAP} label="Mentors" value={rows.reduce((a, r) => a + r.mentors, 0)} tile="lilac" icon={<LifeBuoy />} href="/principal/mentors" helper="Active faculty mentors" />
            <PastelStatTile className={TILE_SNAP} label="Unassigned" value={total - assigned} tile="peach" icon={<UserX />} href="/principal/students?risk=unassigned&view=table" helper="Students without a mentor" />
            <PastelStatTile className={TILE_SNAP} label="Flagged" value={flagged} tile="rose" icon={<ShieldAlert />} href="/principal/interventions" helper="Flagged for intervention" />
            <PastelStatTile className={TILE_SNAP} label="Transfers" value={pendingTransfers ?? 0} tile="blue" icon={<ArrowLeftRight />} href="/principal/transfers" helper="Waiting for your decision" />
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8">
            <BranchComparison rows={rows} />
          </div>
          <div className="min-w-0 lg:col-span-4">
            <DonutWithTotal
              title="Students by branch"
              description="Where the college’s students are"
              totalLabel="Students"
              views={[
                {
                  key: 'all',
                  label: 'All',
                  slices: rows
                    .filter((r) => r.students > 0)
                    .map((r, i) => ({ key: r.code, label: r.code, value: r.students, color: COLORS[i % COLORS.length]!, href: `/principal/students?branch=${r.code}` })),
                },
              ]}
            />
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8">
            <BranchHealthTable rows={rows} />
          </div>
          <div className="min-w-0 lg:col-span-4">
            <Card className="h-full">
              <CardHeader title="Needs your attention" icon={<Crown />} />
              <CardBody>
                {!noHod.length && !pendingTransfers && !lowCoverage.length ? (
                  <EmptyState compact illustration="success" title="All clear" description="Every branch has an HOD, no transfers are waiting and coverage is healthy." />
                ) : (
                  <ul className="space-y-2 text-sm">
                    {noHod.map((b) => (
                      <li key={b.id} className="relative flex items-center justify-between gap-3 rounded-[14px] bg-surface-muted px-3 py-2.5">
                        <Link href={`/principal/hods?branch=${b.code}`} className="font-semibold text-ink-900 after:absolute after:inset-0">
                          {b.code} has no HOD
                        </Link>
                        <Pill tone="accent">Appoint</Pill>
                      </li>
                    ))}
                    {!!pendingTransfers && (
                      <li className="relative flex items-center justify-between gap-3 rounded-[14px] bg-surface-muted px-3 py-2.5">
                        <Link href="/principal/transfers" className="font-semibold text-ink-900 after:absolute after:inset-0">
                          {pendingTransfers} branch transfer{pendingTransfers === 1 ? '' : 's'} waiting
                        </Link>
                        <Pill tone="info">Review</Pill>
                      </li>
                    )}
                    {lowCoverage.map((r) => (
                      <li key={r.id} className="relative flex items-center justify-between gap-3 rounded-[14px] bg-surface-muted px-3 py-2.5">
                        <Link href={`/principal/branches/${r.code}`} className="font-semibold text-ink-900 after:absolute after:inset-0">
                          {r.code} coverage is {r.coverage ?? 0}%
                        </Link>
                        <Pill tone="warning">Below {LOW_COVERAGE}%</Pill>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        </section>
      </div>
    </>
  )
}
