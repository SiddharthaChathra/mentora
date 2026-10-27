import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { BranchOverview } from '@/features/branch/overview'

export const metadata: Metadata = { title: 'Branch overview' }

export default async function HodOverview() {
  const actor = await requireRole('HOD')
  return (
    <BranchOverview
      actor={actor}
      departmentId={actor.departmentId!}
      links={{ students: '/hod/students', mentors: '/hod/mentors', interventions: '/hod/interventions', assignments: '/hod/assignments', student: (id) => `/hod/students/${id}` }}
    />
  )
}
