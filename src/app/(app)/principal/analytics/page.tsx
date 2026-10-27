import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { getSemesterScope } from '@/server/scope'
import { branchHealth, listBranches, loadCollege, principalBranch } from '@/server/services/branches'
import { ScopeChip } from '@/components/shell/scope-chip'
import { PageHeader } from '@/components/ui/page-header'
import { BarList } from '@/components/charts/bars'
import { CohortAnalytics } from '@/features/analytics/cohort'
import { DirectoryToolbar } from '@/features/roster/directory-toolbar'

export const metadata: Metadata = { title: 'College analytics' }

/**
 * College trends by semester (one line per branch), plus branch-level comparisons. Every chart has "View as table"
 * (ChartFrame). Branches are compared; individual students never are.
 */
export default async function PrincipalAnalytics({ searchParams }: { searchParams: Promise<{ branch?: string; year?: string }> }) {
  await requireRole('PRINCIPAL')
  const sp = await searchParams
  const db = await createClient()
  const semScope = await getSemesterScope()
  const selected = await principalBranch(db, sp.branch)
  const parts = await loadCollege(db, selected ? [selected] : await listBranches(db), semScope)
  const codeOf = new Map(parts.flatMap((p) => p.roster.map((r) => [r.id, p.branch.code] as const)))
  const years = [...new Set(parts.flatMap((p) => p.roster.flatMap((r) => r.semesters.map((s) => s.academicYear))))].sort().reverse()
  const yearFilter = (rs: (typeof parts)[number]['roster']) =>
    sp.year && sp.year !== 'all' ? rs.map((r) => ({ ...r, semesters: r.semesters.filter((s) => s.academicYear === sp.year) })).filter((r) => r.semesters.length) : rs
  const roster = parts.flatMap((p) => yearFilter(p.roster))
  const health = parts.map((p) => ({ code: p.branch.code, name: p.branch.name, ...branchHealth({ ...p, roster: yearFilter(p.roster) }) }))
  const passRate = parts.map((p) => {
    let pass = 0
    let decided = 0
    for (const r of yearFilter(p.roster))
      for (const s of r.semesters)
        for (const x of s.results)
          if (x.derivedResult === 'PASS' || x.derivedResult === 'FAIL' || x.derivedResult === 'ABSENT') {
            decided++
            if (x.derivedResult === 'PASS') pass++
          }
    return { code: p.branch.code, pass, decided }
  })

  return (
    <>
      <PageHeader title="College" accent="analytics" description={selected ? `${selected.code} · ${selected.name}: trends, pass rates and mentoring activity.` : 'Trends by semester for every branch, pass rates, SGPA distribution and mentoring activity per branch.'} />
      <ScopeChip scope={semScope} />
      <DirectoryToolbar storageKey="m_principal_analytics_filters" filters={[{ param: 'year', label: 'Academic year', options: [{ value: 'all', label: 'All years' }, ...years.map((y) => ({ value: y, label: y }))] }]} />
      <CohortAnalytics
        roster={roster}
        groupOf={selected ? undefined : (r) => codeOf.get(r.id) ?? 'Other'}
        extra={
          <div className="grid gap-4 xl:grid-cols-2">
            <BarList
              title="Average latest SGPA by branch"
              description="Mean of each student’s most recent SGPA"
              bars={health.filter((h) => h.avgSgpa != null).map((h) => ({ label: h.code, value: Number(h.avgSgpa!.toFixed(2)), display: `${h.avgSgpa!.toFixed(2)} · ${h.students} students`, tone: 'brand' }))}
              max={10}
              empty="No SGPA data yet."
            />
            <BarList
              title="Pass rate by branch"
              description="Passed share of decided subject results"
              bars={passRate.filter((p) => p.decided).map((p) => ({ label: p.code, value: Math.round((p.pass / p.decided) * 100), display: `${Math.round((p.pass / p.decided) * 100)}% · ${p.pass}/${p.decided}`, tone: p.pass / p.decided < 0.8 ? 'warning' : 'success' }))}
              max={100}
              empty="No decided results yet."
            />
            <BarList
              title="Mentoring activity by branch"
              description="Recommendations and completed sessions by all mentors, last 30 days"
              bars={parts.map((p) => {
                const n = p.mentors.reduce((a, m) => a + m.activity30, 0)
                return { label: p.branch.code, value: n, display: `${n} actions · ${p.mentors.filter((m) => m.status === 'ACTIVE').length} mentors`, tone: n === 0 ? 'warning' : 'brand' }
              })}
              empty="No branches yet."
            />
            <BarList
              title="Mentoring coverage by branch"
              description="Students with an active mentor"
              bars={health.filter((h) => h.students).map((h) => ({ label: h.code, value: h.coverage ?? 0, display: `${h.coverage ?? 0}% · ${h.assigned}/${h.students}`, tone: (h.coverage ?? 0) < 80 ? 'warning' : 'success' }))}
              max={100}
              empty="No students yet."
            />
          </div>
        }
      />
    </>
  )
}
