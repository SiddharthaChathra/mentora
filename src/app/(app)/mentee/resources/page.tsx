import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { listResources } from '@/server/services/mentoring'
import { listSubjects } from '@/server/services/academics'
import { PageHeader } from '@/components/ui/page-header'
import { ResourcesWorkspace } from '@/features/mentoring/resources'

export const metadata: Metadata = { title: 'Notes & resources' }

export default async function MenteeResourcesPage() {
  const actor = await requireRole('MENTEE')
  const db = await createClient()
  const [items, subjects] = await Promise.all([listResources(db, actor.id, { studentId: actor.id }), listSubjects(db, actor.departmentId)])
  return (
    <>
      <PageHeader title="Notes &" accent="resources" description="Study material shared by your mentor, with instructions. New items stay marked until you open them." />
      <ResourcesWorkspace items={items} viewer="MENTEE" subjects={subjects} basePath="/mentee/resources" />
    </>
  )
}
