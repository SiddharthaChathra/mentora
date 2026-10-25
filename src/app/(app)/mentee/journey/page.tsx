import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { loadStudentAcademics } from '@/server/services/academics'
import { listRecommendations, listSessions } from '@/server/services/mentoring'
import { PageHeader } from '@/components/ui/page-header'
import { JourneyTimeline } from '@/components/charts/journey-timeline'
import { buildJourney } from '@/features/student/journey'

export const metadata: Metadata = { title: 'Academic journey' }

export default async function MenteeJourneyPage() {
  const actor = await requireRole('MENTEE')
  const db = await createClient()
  const [academics, recs, sessions] = await Promise.all([
    loadStudentAcademics(db, actor.id, actor.departmentId),
    listRecommendations(db, actor.id, actor.id),
    listSessions(db, { studentId: actor.id }),
  ])
  const events = buildJourney(academics.semesters, recs, sessions, {
    semester: (n) => `/mentee/academics/${n}`,
    rec: (id) => `/mentee/mentoring?item=${id}`,
    session: (id) => `/mentee/sessions?item=${id}`,
  })
  return (
    <>
      <PageHeader title="Academic" accent="journey" description="Every semester, piece of feedback, goal and session, in one timeline." />
      <JourneyTimeline events={events} />
    </>
  )
}
