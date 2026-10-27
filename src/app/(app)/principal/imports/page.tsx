import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { listBranches } from '@/server/services/branches'
import { PageHeader } from '@/components/ui/page-header'
import { ImportWizard, type JobRow } from '@/features/admin/imports'

export const metadata: Metadata = { title: 'Bulk import' }

export default async function PrincipalImportsPage() {
  await requireRole('PRINCIPAL')
  const db = await createClient()
  const [branches, { data }] = await Promise.all([
    listBranches(db),
    db.from('import_jobs').select('id, kind, file_name, status, total_rows, valid_rows, error_rows, created_at').order('created_at', { ascending: false }).limit(15),
  ])
  const jobs: JobRow[] = (data ?? []).map((j) => ({ id: j.id, kind: j.kind, fileName: j.file_name, status: j.status, total: j.total_rows, valid: j.valid_rows, errors: j.error_rows, createdAt: j.created_at, summary: {} }))
  return (
    <>
      <PageHeader title="Bulk" accent="import" description="Add students, mentors, subjects or official results to any branch from CSV or Excel. Choose the branch first; every row is validated and previewed before anything is saved." />
      <ImportWizard jobs={jobs} branches={branches.map((b) => ({ id: b.id, code: b.code, name: b.name }))} />
    </>
  )
}
