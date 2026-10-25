import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowDownUp } from 'lucide-react'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { loadRoster, slim } from '@/server/services/roster'
import { getSemesterScope } from '@/server/scope'
import { ScopeChip } from '@/components/shell/scope-chip'
import { listSections } from '@/server/services/people'
import { fmt2, fmtRelative } from '@/lib/utils'
import { PageHeader } from '@/components/ui/page-header'
import { Card, Pill, StatusPill } from '@/components/ui/primitives'
import { Pagination } from '@/components/ui/navigation'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/states'
import { buttonVariants } from '@/components/ui/button'
import { Sparkline } from '@/components/charts/sparkline'
import { RiskChip } from '@/features/roster/roster'
import { DirectoryToolbar } from '@/features/roster/directory-toolbar'

export const metadata: Metadata = { title: 'Students' }
const PAGE = 20
type SP = { q?: string; semester?: string; section?: string; year?: string; status?: string; risk?: string; completion?: string; sort?: string; page?: string }

export default async function HodStudentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const actor = await requireRole('HOD')
  const sp = await searchParams
  const scope = await getSemesterScope()
  const semester = sp.semester && sp.semester !== 'all' ? Number(sp.semester) : scope
  const page = Math.max(1, Number(sp.page) || 1)
  const db = await createClient()
  const sections = await listSections(db, actor.departmentId)
  const { data: years } = await db.from('academic_years').select('label').order('label', { ascending: false })

  // Server-side filtering on indexed columns first.
  let uq = db.from('users').select('id, status').eq('role', 'MENTEE').eq('department_id', actor.departmentId!)
  if (sp.status && sp.status !== 'all') uq = uq.eq('status', sp.status as 'ACTIVE')
  const { data: users } = await uq
  let ids = (users ?? []).map((u) => u.id)
  if (ids.length && (sp.q || semester || (sp.section && sp.section !== 'all') || (sp.completion && sp.completion !== 'all'))) {
    let pq = db.from('student_profiles').select('user_id').in('user_id', ids)
    if (sp.q) {
      const like = `%${sp.q.replace(/[%_,()]/g, ' ').trim()}%`
      pq = pq.or(`full_name.ilike.${like},usn.ilike.${like}`)
    }
    if (semester) pq = pq.eq('current_semester', semester)
    if (sp.section && sp.section !== 'all') pq = pq.eq('section_id', sp.section)
    if (sp.completion === 'incomplete') pq = pq.lt('profile_completion', 100)
    if (sp.completion === 'complete') pq = pq.eq('profile_completion', 100)
    const { data } = await pq
    ids = (data ?? []).map((p) => p.user_id)
  }
  if (sp.year && sp.year !== 'all' && ids.length) {
    const { data } = await db.from('academic_semesters').select('student_id').eq('academic_year', sp.year).in('student_id', ids)
    const set = new Set((data ?? []).map((d) => d.student_id))
    ids = ids.filter((id) => set.has(id))
  }

  let rows = (await loadRoster(db, ids, actor.departmentId)).map(slim)
  if (sp.risk === 'flagged') rows = rows.filter((r) => r.risk !== 'none')
  if (sp.risk === 'high') rows = rows.filter((r) => r.risk === 'high')
  if (sp.risk === 'none') rows = rows.filter((r) => r.risk === 'none')
  if (sp.risk === 'unassigned') rows = rows.filter((r) => !r.mentorId)
  const sort = sp.sort ?? 'name'
  rows.sort((a, b) =>
    sort === 'cgpa' ? (b.cgpa ?? -1) - (a.cgpa ?? -1) : sort === 'cgpa-asc' ? (a.cgpa ?? 99) - (b.cgpa ?? 99) : sort === 'semester' ? (b.currentSemester ?? 0) - (a.currentSemester ?? 0) : (a.name ?? '').localeCompare(b.name ?? ''),
  )
  const total = rows.length
  const pageRows = rows.slice((page - 1) * PAGE, page * PAGE)
  const sortHref = (s: string) => {
    const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][])
    p.set('sort', s)
    p.delete('page')
    return `/hod/students?${p}`
  }

  return (
    <>
      <PageHeader
        title="Student"
        accent="directory"
        description={`${total} student${total === 1 ? '' : 's'} match. Search by name or USN and combine filters; save the ones you use often.`}
        actions={
          <>
            <Link href="/hod/imports" className={buttonVariants({ variant: 'secondary' })}>
              Bulk import
            </Link>
            <Link href="/hod/users?invite=1&role=MENTEE" className={buttonVariants()}>
              Invite student
            </Link>
          </>
        }
      />
      <ScopeChip scope={semester} />
      <DirectoryToolbar
        storageKey="m_hod_student_filters"
        searchPlaceholder="Search name or USN…"
        filters={[
          { param: 'section', label: 'Section', options: [{ value: 'all', label: 'All sections' }, ...sections.map((s) => ({ value: s.id, label: `Section ${s.name}` }))] },
          { param: 'year', label: 'Academic year', options: [{ value: 'all', label: 'Any academic year' }, ...(years ?? []).map((y) => ({ value: y.label, label: y.label }))] },
          { param: 'risk', label: 'Risk', options: [{ value: 'all', label: 'Any status' }, { value: 'flagged', label: 'Flagged' }, { value: 'high', label: 'High priority' }, { value: 'none', label: 'On track' }, { value: 'unassigned', label: 'No mentor' }] },
          { param: 'completion', label: 'Profile', options: [{ value: 'all', label: 'Any profile' }, { value: 'incomplete', label: 'Incomplete' }, { value: 'complete', label: 'Complete' }] },
          { param: 'status', label: 'Account', options: [{ value: 'all', label: 'Any account' }, { value: 'ACTIVE', label: 'Active' }, { value: 'INVITED', label: 'Invited' }] },
        ]}
      />
      {pageRows.length === 0 ? (
        <Card>
          <EmptyState illustration="no-results" title="No students match" description="Clear a filter or search for a different name or USN." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="hidden w-full text-sm md:table">
            <caption className="sr-only">Students</caption>
            <thead className="bg-surface-muted text-left text-[0.6875rem] font-semibold tracking-[0.04em] text-ink-500 uppercase">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">
                  <Link href={sortHref('name')} className="inline-flex items-center gap-1 hover:text-ink-900">
                    Student {sort === 'name' && <ArrowDownUp className="size-3" />}
                  </Link>
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  <Link href={sortHref('semester')} className="inline-flex items-center gap-1 hover:text-ink-900">
                    Sem · Sec {sort === 'semester' && <ArrowDownUp className="size-3" />}
                  </Link>
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">Mentor</th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">
                  <Link href={sortHref(sort === 'cgpa' ? 'cgpa-asc' : 'cgpa')} className="inline-flex items-center gap-1 hover:text-ink-900">
                    CGPA {sort.startsWith('cgpa') && <ArrowDownUp className="size-3" />}
                  </Link>
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">Trend</th>
                <th scope="col" className="px-3 py-3 font-semibold">Status</th>
                <th scope="col" className="px-5 py-3 font-semibold">Profile</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id} className="border-t border-line/70 hover:bg-surface-muted">
                  <td className="px-5 py-3">
                    <Link href={`/hod/students/${r.id}`} className="flex items-center gap-3 font-medium text-ink-900 hover:text-primary-700">
                      <Avatar userId={r.id} name={r.name} hasImage={!!r.avatarPath} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate">{r.name ?? 'New student'}</span>
                        <span className="num block text-xs font-normal text-ink-500">{r.usn ?? '—'}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="num px-3 py-3 text-ink-700">
                    {r.currentSemester ?? '—'} · {r.sectionName ?? '—'}
                  </td>
                  <td className="px-3 py-3">{r.mentorName ? <span className="text-ink-700">{r.mentorName}</span> : <Pill tone="accent">Unassigned</Pill>}</td>
                  <td className="num px-3 py-3 text-right text-ink-900">{fmt2(r.cgpa)}</td>
                  <td className="px-3 py-3">{r.sgpaSeries.length > 1 ? <Sparkline data={r.sgpaSeries} className="h-7 w-20" label={`${r.name} SGPA trend`} min={0} max={10} /> : <span className="text-ink-500">—</span>}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {r.status !== 'ACTIVE' && <StatusPill status={r.status} />}
                      <RiskChip flags={r.flags} />
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="num text-xs text-ink-700">{r.profileCompletion}%</span>
                    {r.lastSession && <span className="block text-xs text-ink-500">Session {fmtRelative(r.lastSession)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="divide-y divide-line md:hidden">
            {pageRows.map((r) => (
              <li key={r.id} className="relative flex items-center gap-3 p-4">
                <Avatar userId={r.id} name={r.name} hasImage={!!r.avatarPath} size="sm" />
                <div className="min-w-0 flex-1">
                  <Link href={`/hod/students/${r.id}`} className="block truncate font-medium text-ink-900 after:absolute after:inset-0">
                    {r.name ?? 'New student'}
                  </Link>
                  <p className="num text-xs text-ink-500">
                    {r.usn} · Sem {r.currentSemester ?? '—'} · CGPA {fmt2(r.cgpa)}
                  </p>
                  <p className="text-xs text-ink-500">{r.mentorName ?? 'No mentor'}</p>
                </div>
                <span className="relative z-[1]">
                  <RiskChip flags={r.flags} compact />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Pagination page={page} pageSize={PAGE} total={total} />
    </>
  )
}
