import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { listBranches } from '@/server/services/branches'
import { PageHeader } from '@/components/ui/page-header'
import { HodManager, type HodBranch } from '@/features/principal/hod-manager'

export const metadata: Metadata = { title: 'Heads of department' }

export default async function PrincipalHods({ searchParams }: { searchParams: Promise<{ branch?: string }> }) {
  await requireRole('PRINCIPAL')
  const sp = await searchParams
  const db = await createClient()
  const branches = await listBranches(db)
  const [{ data: staff }, { data: history }] = await Promise.all([
    db.from('users').select('id, email, role, status, department_id').in('role', ['MENTOR', 'HOD']).neq('status', 'SUSPENDED'),
    db.from('department_heads').select('id, department_id, user_id, started_at, ended_at, reason, end_reason').order('started_at', { ascending: false }),
  ])
  const ids = [...new Set([...(staff ?? []).map((s) => s.id), ...(history ?? []).map((h) => h.user_id)])]
  const [{ data: mp }, { data: hp }] = await Promise.all([
    ids.length ? db.from('mentor_profiles').select('user_id, full_name, avatar_path').in('user_id', ids) : Promise.resolve({ data: [] }),
    ids.length ? db.from('hod_profiles').select('user_id, full_name, avatar_path').in('user_id', ids) : Promise.resolve({ data: [] }),
  ])
  const prof = new Map([...(mp ?? []), ...(hp ?? [])].map((p) => [p.user_id, p]))
  const rows: HodBranch[] = branches.map((b) => ({
    id: b.id,
    code: b.code,
    name: b.name,
    head: b.headId ? { id: b.headId, name: b.headName, since: b.headSince!, hasAvatar: !!prof.get(b.headId)?.avatar_path, suspended: b.headSuspended } : null,
    candidates: (staff ?? [])
      .filter((s) => s.department_id === b.id && s.id !== b.headId)
      .map((s) => ({ id: s.id, name: prof.get(s.id)?.full_name ?? null, email: s.email, role: s.role }))
      .sort((x, y) => (x.name ?? x.email).localeCompare(y.name ?? y.email)),
    history: (history ?? [])
      .filter((h) => h.department_id === b.id)
      .map((h) => ({ id: h.id, name: prof.get(h.user_id)?.full_name ?? null, startedAt: h.started_at, endedAt: h.ended_at, reason: h.reason, endReason: h.end_reason })),
  }))
  return (
    <>
      <PageHeader
        title="Heads of"
        accent="department"
        description="One HOD per branch. Appoint, change or end an appointment; the old HOD loses access immediately and every change is audited."
      />
      <HodManager branches={rows} focus={sp.branch?.toUpperCase()} />
    </>
  )
}
