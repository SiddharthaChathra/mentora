import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { listMentees } from '@/server/services/people'
import { getSemesterScope } from '@/server/scope'
import { inScope } from '@/lib/scope'
import { ScopeChip } from '@/components/shell/scope-chip'
import { loadRoster } from '@/server/services/roster'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/states'
import { CohortAnalytics } from '@/features/analytics/cohort'

export const metadata: Metadata = { title: 'Analytics' }

export default async function MentorAnalyticsPage() {
  const actor = await requireRole('MENTOR')
  const db = await createClient()
  const scope = await getSemesterScope()
  const mentees = inScope(await listMentees(db, actor.id), scope)
  const roster = await loadRoster(db, mentees.map((m) => m.id), actor.departmentId)
  return (
    <>
      <PageHeader title="Mentee" accent="analytics" description="Trends and patterns across the students assigned to you. Open a mentee’s profile for individual insights." />
      <ScopeChip scope={scope} />
      {roster.length === 0 ? (
        <Card>
          <EmptyState illustration="no-mentees" title="No mentees yet" description="Analytics appear once students are assigned to you." />
        </Card>
      ) : (
        <CohortAnalytics roster={roster} />
      )}
    </>
  )
}
