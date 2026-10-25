import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { listSessions } from '@/server/services/mentoring'
import { PageHeader } from '@/components/ui/page-header'
import { SessionsWorkspace } from '@/features/mentoring/sessions'

export const metadata: Metadata = { title: 'Mentoring sessions' }

export default async function MenteeSessionsPage() {
  const actor = await requireRole('MENTEE')
  const db = await createClient()
  const sessions = await listSessions(db, { studentId: actor.id })
  return (
    <>
      <PageHeader title="Mentoring" accent="sessions" description="Upcoming sessions, summaries and the action items you agreed on." />
      <SessionsWorkspace sessions={sessions} viewer="MENTEE" />
    </>
  )
}
