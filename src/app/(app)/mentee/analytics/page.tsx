import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { PageHeader } from '@/components/ui/page-header'
import { AnalyticsPanel, type AnalyticsParams } from '@/features/student/analytics-panel'

export const metadata: Metadata = { title: 'Performance analytics' }

export default async function MenteeAnalyticsPage({ searchParams }: { searchParams: Promise<AnalyticsParams> }) {
  const actor = await requireRole('MENTEE')
  const db = await createClient()
  return (
    <>
      <PageHeader
        title="Performance"
        accent="analytics"
        description="Your trends, comparisons and transparent insights. Open “Why am I seeing this?” on any insight to see the marks behind it."
      />
      <AnalyticsPanel db={db} studentId={actor.id} departmentId={actor.departmentId} params={await searchParams} viewer="MENTEE" />
    </>
  )
}
