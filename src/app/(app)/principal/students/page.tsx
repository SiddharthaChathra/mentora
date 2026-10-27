import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { getSemesterScope } from '@/server/scope'
import { listBranches, loadCollege, principalBranch, type Branch } from '@/server/services/branches'
import { slim, type SlimRoster } from '@/server/services/roster'
import { fmt2 } from '@/lib/utils'
import { ScopeChip } from '@/components/shell/scope-chip'
import { PageHeader } from '@/components/ui/page-header'
import { Card, Pill, StatusPill } from '@/components/ui/primitives'
import { FilterChips, Pagination } from '@/components/ui/navigation'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/states'
import { PercentBar } from '@/components/charts/dashboard'
import { RiskChip } from '@/features/roster/roster'
import { DirectoryToolbar } from '@/features/roster/directory-toolbar'
import { ViewToggle } from '@/features/principal/view-toggle'

export const metadata: Metadata = { title: 'Students by branch' }

const PAGE = 25
const SECTION_PAGE = 10
type SP = { q?: string; branch?: string; semester?: string; year?: string; risk?: string; mentor?: string; completion?: string; sort?: string; page?: string; view?: string; open?: string }
type Row = SlimRoster & { branch: Branch; years: string[] }

/**
 * Every student in the college, grouped by branch (MB-13). Read-only: rows open the read-only profile.
 * Sorting is by name, branch or semester only — there is deliberately no rank/CGPA ordering.
 */
export default async function PrincipalStudents({ searchParams }: { searchParams: Promise<SP> }) {
  await requireRole('PRINCIPAL')
  const sp = await searchParams
  const db = await createClient()
  const scope = await getSemesterScope()
  const semester = sp.semester && sp.semester !== 'all' ? Number(sp.semester) : scope
  const [branches, selected] = await Promise.all([listBranches(db), principalBranch(db, sp.branch)])
  const shown = selected ? [selected] : branches
  const [parts, { data: years }] = await Promise.all([loadCollege(db, shown, semester), db.from('academic_years').select('label').order('label', { ascending: false })])

  const q = sp.q?.trim().toLowerCase()
  let rows: Row[] = parts.flatMap((p) => p.roster.map((r) => ({ ...slim(r), branch: p.branch, years: r.semesters.map((s) => s.academicYear) })))
  if (q) rows = rows.filter((r) => (r.name ?? '').toLowerCase().includes(q) || (r.usn ?? '').toLowerCase().includes(q))
  if (sp.year && sp.year !== 'all') rows = rows.filter((r) => r.years.includes(sp.year!))
  if (sp.risk === 'flagged') rows = rows.filter((r) => r.risk !== 'none')
  if (sp.risk === 'high') rows = rows.filter((r) => r.risk === 'high')
  if (sp.risk === 'none') rows = rows.filter((r) => r.risk === 'none')
  if (sp.risk === 'unassigned' || sp.mentor === 'unassigned') rows = rows.filter((r) => !r.mentorId)
  if (sp.mentor === 'assigned') rows = rows.filter((r) => r.mentorId)
  if (sp.completion === 'incomplete') rows = rows.filter((r) => r.profileCompletion < 100)
  if (sp.completion === 'complete') rows = rows.filter((r) => r.profileCompletion === 100)
  const sort = sp.sort ?? 'name'
  rows.sort((a, b) =>
    sort === 'semester'
      ? (b.currentSemester ?? 0) - (a.currentSemester ?? 0) || (a.name ?? '').localeCompare(b.name ?? '')
      : sort === 'branch'
        ? a.branch.displayOrder - b.branch.displayOrder || (a.name ?? '').localeCompare(b.name ?? '')
        : (a.name ?? '').localeCompare(b.name ?? ''),
  )
  const view = sp.view === 'table' ? 'table' : 'grouped'
  const page = Math.max(1, Number(sp.page) || 1)

  return (
    <>
      <PageHeader
        title="Students"
        accent="by branch"
        description={`${rows.length} student${rows.length === 1 ? '' : 's'} ${selected ? `in ${selected.code}` : 'across the college'}. Profiles open read-only.`}
        actions={<ViewToggle />}
      />
      <ScopeChip scope={semester} />
      <DirectoryToolbar
        storageKey="m_principal_student_filters"
        searchPlaceholder="Search name or USN…"
        filters={[
          { param: 'year', label: 'Academic year', options: [{ value: 'all', label: 'Any academic year' }, ...(years ?? []).map((y) => ({ value: y.label, label: y.label }))] },
          { param: 'mentor', label: 'Mentor', options: [{ value: 'all', label: 'Any mentor' }, { value: 'assigned', label: 'Has a mentor' }, { value: 'unassigned', label: 'No mentor' }] },
          { param: 'risk', label: 'Risk', options: [{ value: 'all', label: 'Any status' }, { value: 'flagged', label: 'Flagged' }, { value: 'high', label: 'High priority' }, { value: 'none', label: 'On track' }] },
          { param: 'completion', label: 'Profile', options: [{ value: 'all', label: 'Any profile' }, { value: 'incomplete', label: 'Incomplete' }, { value: 'complete', label: 'Complete' }] },
          { param: 'sort', label: 'Sort', options: [{ value: 'all', label: 'Name' }, { value: 'branch', label: 'Branch' }, { value: 'semester', label: 'Semester' }] },
        ]}
      />
      {view === 'table' && (
        <div className="mb-4">
          <FilterChips param="branch" label="Branch" options={[{ value: 'all', label: 'All branches' }, ...branches.map((b) => ({ value: b.code, label: b.code }))]} />
        </div>
      )}

      {rows.length === 0 ? (
        <Card>
          <EmptyState illustration="no-results" title="No students match" description="Clear a filter or search for a different name or USN." />
        </Card>
      ) : view === 'table' ? (
        <>
          <StudentTable rows={rows.slice((page - 1) * PAGE, page * PAGE)} showBranch />
          <Pagination page={page} pageSize={PAGE} total={rows.length} />
        </>
      ) : (
        <div className="space-y-4">
          {shown.map((b) => {
            const list = rows.filter((r) => r.branch.id === b.id)
            const all = parts.find((p) => p.branch.id === b.id)?.roster ?? []
            const coverage = all.length ? Math.round((all.filter((r) => r.mentorId).length / all.length) * 100) : null
            const flagged = all.filter((r) => r.risk !== 'none').length
            return (
              <details key={b.id} open={shown.length === 1 || sp.open === b.code || shown.length <= 3} className="group rounded-[24px] bg-surface shadow-2">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 p-5 [&::-webkit-details-marker]:hidden">
                  <ChevronDown className="size-5 text-ink-500 transition-transform group-open:rotate-180" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-semibold text-ink-900">
                      <Pill tone="brand">{b.code}</Pill> <span className="truncate">{b.name}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-500">{b.headName ? `HOD ${b.headName}` : 'No HOD appointed'}</span>
                  </span>
                  <span className="num text-sm text-ink-700">
                    <span className="font-semibold text-ink-900">{list.length}</span>
                    {list.length !== all.length && ` of ${all.length}`} students
                  </span>
                  <span className="w-40">
                    <PercentBar value={coverage} label={`${b.code} coverage`} />
                  </span>
                  <Pill tone={flagged ? 'warning' : 'success'}>{flagged} flagged</Pill>
                </summary>
                <div className="px-3 pb-4">
                  {list.length ? (
                    <>
                      <StudentTable rows={list.slice(0, SECTION_PAGE)} flat />
                      {list.length > SECTION_PAGE && (
                        <Link href={`/principal/students?view=table&branch=${b.code}`} className="mt-2 inline-flex px-3 text-sm font-semibold text-primary-700 hover:underline">
                          See all {list.length} in {b.code} →
                        </Link>
                      )}
                    </>
                  ) : (
                    <p className="px-3 text-sm text-ink-500">No students match in this branch.</p>
                  )}
                </div>
              </details>
            )
          })}
        </div>
      )}
    </>
  )
}

function StudentTable({ rows, showBranch = false, flat = false }: { rows: Row[]; showBranch?: boolean; flat?: boolean }) {
  return (
    <Card className={flat ? 'overflow-hidden shadow-none' : 'overflow-hidden'}>
      <table className="hidden w-full text-sm md:table">
        <caption className="sr-only">Students</caption>
        <thead className="bg-surface-muted text-left text-[0.6875rem] font-semibold tracking-[0.04em] text-ink-500 uppercase">
          <tr>
            <th scope="col" className="px-5 py-3 font-semibold">Student</th>
            {showBranch && <th scope="col" className="px-3 py-3 font-semibold">Branch</th>}
            <th scope="col" className="px-3 py-3 font-semibold">Sem · Sec</th>
            <th scope="col" className="px-3 py-3 font-semibold">Mentor</th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">CGPA</th>
            <th scope="col" className="px-3 py-3 font-semibold">Status</th>
            <th scope="col" className="px-5 py-3 font-semibold">Profile</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-line/70 hover:bg-surface-muted">
              <td className="px-5 py-3">
                <Link href={`/principal/students/${r.id}`} className="flex items-center gap-3 font-medium text-ink-900 hover:text-primary-700">
                  <Avatar userId={r.id} name={r.name} hasImage={!!r.avatarPath} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate">{r.name ?? 'New student'}</span>
                    <span className="num block text-xs font-normal text-ink-500">{r.usn ?? '—'}</span>
                  </span>
                </Link>
              </td>
              {showBranch && (
                <td className="px-3 py-3">
                  <Pill tone="neutral">{r.branch.code}</Pill>
                </td>
              )}
              <td className="num px-3 py-3 text-ink-700">
                {r.currentSemester ?? '—'} · {r.sectionName ?? '—'}
              </td>
              <td className="px-3 py-3">{r.mentorName ? <span className="text-ink-700">{r.mentorName}</span> : <Pill tone="accent">Unassigned</Pill>}</td>
              <td className="num px-3 py-3 text-right text-ink-900">{fmt2(r.cgpa)}</td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {r.status !== 'ACTIVE' && <StatusPill status={r.status} />}
                  <RiskChip flags={r.flags} />
                </div>
              </td>
              <td className="num px-5 py-3 text-xs text-ink-700">{r.profileCompletion}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="divide-y divide-line md:hidden">
        {rows.map((r) => (
          <li key={r.id} className="relative flex items-center gap-3 p-4">
            <Avatar userId={r.id} name={r.name} hasImage={!!r.avatarPath} size="sm" />
            <div className="min-w-0 flex-1">
              <Link href={`/principal/students/${r.id}`} className="block truncate font-medium text-ink-900 after:absolute after:inset-0">
                {r.name ?? 'New student'}
              </Link>
              <p className="num truncate text-xs text-ink-500">
                {showBranch && `${r.branch.code} · `}
                {r.usn} · Sem {r.currentSemester ?? '—'} · CGPA {fmt2(r.cgpa)}
              </p>
              <p className="truncate text-xs text-ink-500">{r.mentorName ?? 'No mentor'}</p>
            </div>
            <span className="relative z-[1]">
              <RiskChip flags={r.flags} compact />
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
