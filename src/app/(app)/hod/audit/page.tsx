import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { AuditView, type AuditSearch } from '@/features/admin/audit-view'

export const metadata: Metadata = { title: 'Audit history' }

export default async function HodAuditPage({ searchParams }: { searchParams: Promise<AuditSearch> }) {
  await requireRole('HOD')
  return <AuditView sp={await searchParams} storageKey="m_hod_audit_filters" description="Append-only record of changes in your branch to marks, CGPA, assignments, mentoring records, roles and settings — who changed what, and when." />
}
