import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { principalBranch } from '@/server/services/branches'
import { AuditView, type AuditSearch } from '@/features/admin/audit-view'

export const metadata: Metadata = { title: 'Audit history' }

export default async function PrincipalAuditPage({ searchParams }: { searchParams: Promise<AuditSearch & { branch?: string }> }) {
  await requireRole('PRINCIPAL')
  const sp = await searchParams
  const branch = await principalBranch(await createClient(), sp.branch)
  return (
    <AuditView
      sp={sp}
      departmentId={branch?.id ?? null}
      storageKey="m_principal_audit_filters"
      description={`Append-only record of every change ${branch ? `in ${branch.code}` : 'across the college'}: marks, assignments, HOD appointments, transfers, roles and settings.`}
    />
  )
}
