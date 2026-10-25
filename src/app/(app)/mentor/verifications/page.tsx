import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { loadVerificationQueues } from '@/server/services/verifications'
import { getSemesterScope } from '@/server/scope'
import { ScopeChip } from '@/components/shell/scope-chip'
import { PageHeader } from '@/components/ui/page-header'
import { TabLinks } from '@/components/ui/navigation'
import { CorrectionQueue, VerificationQueue } from '@/features/academics/verifications'

export const metadata: Metadata = { title: 'Verifications' }

export default async function MentorVerificationsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const actor = await requireRole('MENTOR')
  const tab = (await searchParams).tab === 'corrections' ? 'corrections' : 'submitted'
  const db = await createClient()
  const scope = await getSemesterScope()
  const queues = await loadVerificationQueues(db, actor.departmentId, { history: tab === 'corrections' })
  const semesters = scope ? queues.semesters.filter((s) => s.semesterNo === scope) : queues.semesters
  const corrections = scope ? queues.corrections.filter((c) => c.semesterNo === scope) : queues.corrections
  const pendingCorrections = corrections.filter((c) => c.status === 'PENDING')
  return (
    <>
      <PageHeader title="Record" accent="verifications" description="Check submitted semesters against official results, and review correction requests for verified records. Only your active mentees appear here." />
      <ScopeChip scope={scope} label={`Showing semester ${scope} records only.`} />
      <TabLinks
        className="mb-6"
        tabs={[
          { value: 'submitted', label: 'Submitted semesters', count: semesters.length },
          { value: 'corrections', label: 'Correction requests', count: pendingCorrections.length },
        ]}
      />
      {tab === 'submitted' ? <VerificationQueue semesters={semesters} hrefBase="/mentor/mentees" /> : <CorrectionQueue items={corrections} hrefBase="/mentor/mentees" />}
    </>
  )
}
