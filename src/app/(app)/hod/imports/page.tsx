import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { PageHeader } from '@/components/ui/page-header'
import { ImportWizard, type JobRow } from '@/features/admin/imports'

export const metadata: Metadata = { title: 'Bulk import' }

export default async function HodImportsPage() {
  await requireRole('HOD')
  const db = await createClient()
  const { data } = await db.from('import_jobs').select('id, kind, file_name, status, total_rows, valid_rows, error_rows, created_at').order('created_at', { ascending: false }).limit(15)
  const jobs: JobRow[] = (data ?? []).map((j) => ({ id: j.id, kind: j.kind, fileName: j.file_name, status: j.status, total: j.total_rows, valid: j.valid_rows, errors: j.error_rows, createdAt: j.created_at, summary: {} }))
  return (
    <>
      <PageHeader title="Bulk" accent="import" description="Upload students, mentors, subjects or results from CSV or Excel. Every row is validated and previewed before anything is saved." />
      <ImportWizard jobs={jobs} />
    </>
  )
}
