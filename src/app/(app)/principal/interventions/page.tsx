import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { getSemesterScope } from '@/server/scope'
import { listBranches, loadCollegeDigest, principalBranch } from '@/server/services/branches'
import { ScopeChip } from '@/components/shell/scope-chip'
import { PageHeader } from '@/components/ui/page-header'
import { Pill } from '@/components/ui/primitives'
import { InterventionsBoard, type InterventionRow } from '@/features/admin/interventions'
import { NotifyHodButton } from '@/features/principal/notify-hod'
import { ReadOnlyBanner } from '@/features/principal/read-only-banner'

export const metadata: Metadata = { title: 'Interventions' }
const PREVIEW = 8

/** Flagged students across branches, grouped by branch; reasons always shown; read-only with "Notify HOD". */
export default async function PrincipalInterventions({ searchParams }: { searchParams: Promise<{ branch?: string }> }) {
  await requireRole('PRINCIPAL')
  const sp = await searchParams
  const db = await createClient()
  const scope = await getSemesterScope()
  const selected = await principalBranch(db, sp.branch)
  const branches = selected ? [selected] : await listBranches(db)
  const parts = await loadCollegeDigest(db, branches, scope)
  const { data: followups } = await db.from('intervention_followups').select('id, student_id, note, created_at').eq('status', 'OPEN')
  const fBy = new Map((followups ?? []).map((f) => [f.student_id, f]))
  const groups = parts.map((p) => ({
    branch: p.branch,
    rows: p.roster
      .filter((r) => r.risk !== 'none')
      .sort((a, b) => (b.risk === 'high' ? 1 : 0) - (a.risk === 'high' ? 1 : 0) || b.flags.length - a.flags.length)
      .map(
        (r): InterventionRow => ({
          id: r.id,
          name: r.name,
          usn: r.usn,
          hasAvatar: !!r.avatarPath,
          semester: r.currentSemester,
          section: r.sectionName,
          mentorName: r.mentorName,
          cgpa: r.cgpa,
          flags: r.flags,
          risk: r.risk,
          openFollowup: fBy.get(r.id) ? { id: fBy.get(r.id)!.id, note: fBy.get(r.id)!.note, createdAt: fBy.get(r.id)!.created_at } : null,
        }),
      ),
  }))
  const total = groups.reduce((a, g) => a + g.rows.length, 0)
  return (
    <>
      <PageHeader title="Students needing" accent="intervention" description={`${total} student${total === 1 ? '' : 's'} flagged ${selected ? `in ${selected.code}` : 'across the college'}, grouped by branch. Every flag lists its reason.`} />
      <ReadOnlyBanner>Follow-ups are requested by each branch HOD. Use “Notify HOD” to ask them to act.</ReadOnlyBanner>
      <ScopeChip scope={scope} />
      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g.branch.id} aria-label={`${g.branch.code} interventions`}>
            <h2 className="mb-3 flex flex-wrap items-center gap-2 text-lg font-semibold text-ink-900">
              <Pill tone="brand">{g.branch.code}</Pill> {g.branch.name}
              <span className="num text-sm font-medium text-ink-500">· {g.rows.length} flagged</span>
            </h2>
            <InterventionsBoard
              rows={selected ? g.rows : g.rows.slice(0, PREVIEW)}
              readOnly
              studentBase="/principal/students"
              action={<NotifyHodButton departmentId={g.branch.id} code={g.branch.code} count={g.rows.length} hasHod={!!g.branch.headId} />}
            />
            {!selected && g.rows.length > PREVIEW && (
              <Link href={`/principal/interventions?branch=${g.branch.code}`} className="mt-3 inline-flex text-sm font-semibold text-primary-700 hover:underline">
                See all {g.rows.length} flagged in {g.branch.code} →
              </Link>
            )}
          </section>
        ))}
      </div>
    </>
  )
}
