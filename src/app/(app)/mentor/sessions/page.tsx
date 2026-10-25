import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { listSessions } from '@/server/services/mentoring'
import { listMentees } from '@/server/services/people'
import { PageHeader } from '@/components/ui/page-header'
import { SessionsWorkspace } from '@/features/mentoring/sessions'

export const metadata: Metadata = { title: 'Sessions & follow-ups' }

export default async function MentorSessionsPage() {
  const actor = await requireRole('MENTOR')
  const db = await createClient()
  const [sessions, mentees] = await Promise.all([listSessions(db, { mentorId: actor.id }), listMentees(db, actor.id)])
  return (
    <>
      <PageHeader title="Sessions &" accent="follow-ups" description="Schedule one-to-one or group sessions, record summaries, and turn agreed actions into tracked action points." />
      <SessionsWorkspace sessions={sessions} viewer="MENTOR" mentees={mentees.map((m) => ({ id: m.id, name: m.name }))} />
    </>
  )
}
