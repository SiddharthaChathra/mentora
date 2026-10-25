import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { listResources } from '@/server/services/mentoring'
import { listSubjects } from '@/server/services/academics'
import { listMentees } from '@/server/services/people'
import { PageHeader } from '@/components/ui/page-header'
import { ResourcesWorkspace } from '@/features/mentoring/resources'

export const metadata: Metadata = { title: 'Resources' }

export default async function MentorResourcesPage() {
  const actor = await requireRole('MENTOR')
  const db = await createClient()
  const [items, subjects, mentees] = await Promise.all([listResources(db, actor.id, { mentorId: actor.id }), listSubjects(db, actor.departmentId), listMentees(db, actor.id)])
  return (
    <>
      <PageHeader title="Study" accent="materials" description="Notes, slides and links you’ve shared — with one mentee or your whole group. Files stay private and download through short-lived links." />
      <ResourcesWorkspace items={items} viewer="MENTOR" subjects={subjects} mentees={mentees.map((m) => ({ id: m.id, name: m.name }))} basePath="/mentor/resources" />
    </>
  )
}
