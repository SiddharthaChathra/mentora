import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { listRecommendations } from '@/server/services/mentoring'
import { getActiveMentor, getSettings } from '@/server/services/people'
import { listSubjects } from '@/server/services/academics'
import { PageHeader } from '@/components/ui/page-header'
import { MentoringWorkspace } from '@/features/mentoring/recommendations'

export const metadata: Metadata = { title: 'Feedback & improvement plan' }

export default async function MenteeMentoringPage() {
  const actor = await requireRole('MENTEE')
  const db = await createClient()
  const [items, mentor, settings, subjects] = await Promise.all([
    listRecommendations(db, actor.id, actor.id, { withHistory: true }),
    getActiveMentor(db, actor.id),
    getSettings(db),
    listSubjects(db, actor.departmentId),
  ])
  return (
    <>
      <PageHeader
        title="Feedback &"
        accent="plan"
        description={
          mentor
            ? `Recommendations, goals and notes from ${mentor.fullName}. Update goals and action points as you make progress.`
            : 'Recommendations and goals from your mentor appear here.'
        }
      />
      <MentoringWorkspace items={items} viewer="MENTEE" studentId={actor.id} subjects={subjects} attendanceEnabled={settings.attendanceEnabled} canWrite={false} />
    </>
  )
}
