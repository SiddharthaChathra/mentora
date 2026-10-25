import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { PageHeader } from '@/components/ui/page-header'
import { getSemesterScope } from '@/server/scope'
import { ScopeChip } from '@/components/shell/scope-chip'
import { AnalyticsPanel, type AnalyticsParams } from '@/features/student/analytics-panel'

export const metadata: Metadata = { title: 'Performance analytics' }

export default async function MenteeAnalyticsPage({ searchParams }: { searchParams: Promise<AnalyticsParams> }) {
  const actor = await requireRole('MENTEE')
  const db = await createClient()
  const [params, scope] = await Promise.all([searchParams, getSemesterScope()])
  return (
    <>
      <PageHeader
        title="Performance"
        accent="analytics"
        description="Your trends, comparisons and transparent insights. Open “Why am I seeing this?” on any insight to see the marks behind it."
      />
      <ScopeChip scope={params.sem ? null : scope} label={`Focused on semester ${scope}.`} />
      <AnalyticsPanel db={db} studentId={actor.id} departmentId={actor.departmentId} params={{ ...params, sem: params.sem ?? (scope ? String(scope) : undefined) }} viewer="MENTEE" />
    </>
  )
}
