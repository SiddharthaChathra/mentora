import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { loadDepartment } from '@/server/services/department'
import { getSemesterScope } from '@/server/scope'
import { ScopeChip } from '@/components/shell/scope-chip'
import { PageHeader } from '@/components/ui/page-header'
import { BarList } from '@/components/charts/bars'
import { CohortAnalytics } from '@/features/analytics/cohort'
import { DirectoryToolbar } from '@/features/roster/directory-toolbar'

export const metadata: Metadata = { title: 'Department analytics' }

export default async function HodAnalyticsPage({ searchParams }: { searchParams: Promise<{ section?: string; semester?: string; year?: string }> }) {
  const actor = await requireRole('HOD')
  const sp = await searchParams
  const db = await createClient()
  const semScope = await getSemesterScope()
  const { roster, mentors } = await loadDepartment(db, actor, semScope)
  const sections = [...new Set(roster.map((r) => r.sectionName).filter(Boolean))].sort() as string[]
  const years = [...new Set(roster.flatMap((r) => r.semesters.map((s) => s.academicYear)))].sort().reverse()
  let scope = roster
  if (sp.section && sp.section !== 'all') scope = scope.filter((r) => r.sectionName === sp.section)
  if (sp.year && sp.year !== 'all') scope = scope.map((r) => ({ ...r, semesters: r.semesters.filter((s) => s.academicYear === sp.year) })).filter((r) => r.semesters.length)

  return (
    <>
      <PageHeader title="Department" accent="analytics" description="Performance trends, pass rates, SGPA distribution and mentoring activity across your department." />
      <ScopeChip scope={semScope} />
      <DirectoryToolbar
        storageKey="m_hod_analytics_filters"
        filters={[
          { param: 'section', label: 'Section', options: [{ value: 'all', label: 'All sections' }, ...sections.map((s) => ({ value: s, label: `Section ${s}` }))] },
          { param: 'year', label: 'Academic year', options: [{ value: 'all', label: 'All years' }, ...years.map((y) => ({ value: y, label: y }))] },
        ]}
      />
      <CohortAnalytics
        roster={scope}
        extra={
          <div className="grid gap-4 xl:grid-cols-2">
            <BarList
              title="Mentoring activity"
              description="Recommendations and completed sessions in the last 30 days"
              bars={mentors.filter((m) => m.status === 'ACTIVE').map((m) => ({ label: m.name ?? m.email, value: m.activity30, display: `${m.activity30} actions · ${m.mentees.length} mentees`, tone: m.activity30 === 0 ? 'warning' : 'brand' }))}
              empty="No active mentors."
            />
            <BarList
              title="Mentee coverage by mentor"
              description="Assigned mentees against capacity"
              bars={mentors.filter((m) => m.status === 'ACTIVE').map((m) => ({ label: m.name ?? m.email, value: m.mentees.length, display: `${m.mentees.length} / ${m.capacity}`, tone: m.mentees.length > m.capacity ? 'danger' : 'success' }))}
              empty="No active mentors."
            />
          </div>
        }
      />
    </>
  )
}
