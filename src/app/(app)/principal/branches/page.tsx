import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { branchCounts, listBranches } from '@/server/services/branches'
import { PageHeader } from '@/components/ui/page-header'
import { BranchManager } from '@/features/principal/branch-manager'

export const metadata: Metadata = { title: 'Branches' }

export default async function PrincipalBranches() {
  await requireRole('PRINCIPAL')
  const db = await createClient()
  const [branches, counts] = await Promise.all([listBranches(db, { includeArchived: true }), branchCounts(db)])
  return (
    <>
      <PageHeader title="College" accent="branches" description="Every branch, its HOD and mentoring coverage. Create, rename, reorder or archive branches; open one to see it as its HOD does." />
      <BranchManager
        branches={branches.map((b) => {
          const c = counts(b.id)
          return { id: b.id, code: b.code, name: b.name, usnCode: b.usnCode, status: b.status, headName: b.headName, students: c.students, mentors: c.mentors, coverage: c.coverage }
        })}
      />
    </>
  )
}
