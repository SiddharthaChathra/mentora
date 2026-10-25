import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { PageHeader } from '@/components/ui/page-header'
import { Pagination } from '@/components/ui/navigation'
import { AuditList, type AuditRow } from '@/features/admin/audit'
import { DirectoryToolbar } from '@/features/roster/directory-toolbar'
import { AuditDateRange } from './date-range'

export const metadata: Metadata = { title: 'Audit history' }
const PAGE = 30

export default async function HodAuditPage({ searchParams }: { searchParams: Promise<{ entity?: string; action?: string; from?: string; to?: string; record?: string; page?: string }> }) {
  await requireRole('HOD')
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const db = await createClient()
  let q = db.from('audit_logs').select('id, actor_id, action, entity_type, entity_id, before, after, ip, created_at', { count: 'exact' }).order('created_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1)
  if (sp.entity && sp.entity !== 'all') q = q.eq('entity_type', sp.entity)
  if (sp.action && sp.action !== 'all') q = sp.action === 'other' ? q.like('action', '%.%') : q.eq('action', sp.action)
  if (sp.from) q = q.gte('created_at', new Date(sp.from).toISOString())
  if (sp.to) q = q.lte('created_at', new Date(new Date(sp.to).getTime() + 86400000).toISOString())
  if (sp.record) q = q.eq('entity_id', sp.record)
  const { data, count } = await q
  const actorIds = [...new Set((data ?? []).map((r) => r.actor_id).filter(Boolean))] as string[]
  const [{ data: users }, { data: s }, { data: m }, { data: h }] = await Promise.all([
    actorIds.length ? db.from('users').select('id, email').in('id', actorIds) : Promise.resolve({ data: [] }),
    actorIds.length ? db.from('student_profiles').select('user_id, full_name').in('user_id', actorIds) : Promise.resolve({ data: [] }),
    actorIds.length ? db.from('mentor_profiles').select('user_id, full_name').in('user_id', actorIds) : Promise.resolve({ data: [] }),
    actorIds.length ? db.from('hod_profiles').select('user_id, full_name').in('user_id', actorIds) : Promise.resolve({ data: [] }),
  ])
  const names = new Map<string, string>([...(users ?? []).map((u) => [u.id, u.email] as [string, string]), ...[...(s ?? []), ...(m ?? []), ...(h ?? [])].filter((p) => p.full_name).map((p) => [p.user_id, p.full_name!] as [string, string])])
  const rows: AuditRow[] = (data ?? []).map((r) => ({
    id: r.id,
    actor: r.actor_id ? (names.get(r.actor_id) ?? 'User') : 'System',
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    before: r.before as Record<string, unknown> | null,
    after: r.after as Record<string, unknown> | null,
    ip: r.ip,
    createdAt: r.created_at,
  }))
  return (
    <>
      <PageHeader title="Audit" accent="history" description="Append-only record of changes to marks, CGPA, assignments, mentoring records, roles and settings — who changed what, and when." />
      <DirectoryToolbar
        storageKey="m_hod_audit_filters"
        filters={[
          {
            param: 'entity',
            label: 'Entity',
            options: [
              { value: 'all', label: 'All entities' },
              { value: 'student_subject_results', label: 'Subject results' },
              { value: 'academic_semesters', label: 'Semesters' },
              { value: 'semester_summaries', label: 'SGPA/CGPA' },
              { value: 'mentor_assignments', label: 'Assignments' },
              { value: 'mentor_recommendations', label: 'Mentoring records' },
              { value: 'record_change_requests', label: 'Corrections' },
              { value: 'users', label: 'User accounts' },
              { value: 'grading_schemes', label: 'Grading' },
              { value: 'app_settings', label: 'Settings' },
              { value: 'student_report', label: 'PDF reports' },
            ],
          },
          { param: 'action', label: 'Action', options: [{ value: 'all', label: 'Any action' }, { value: 'insert', label: 'Created' }, { value: 'update', label: 'Updated' }, { value: 'delete', label: 'Deleted' }, { value: 'other', label: 'Downloads & jobs' }] },
        ]}
      />
      <AuditDateRange />
      <AuditList rows={rows} />
      <Pagination page={page} pageSize={PAGE} total={count ?? 0} />
    </>
  )
}
