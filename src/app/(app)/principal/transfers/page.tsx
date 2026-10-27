import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { listBranches, principalBranch } from '@/server/services/branches'
import { PageHeader } from '@/components/ui/page-header'
import { TransferBoard, type TransferRow } from '@/features/principal/transfer-board'

export const metadata: Metadata = { title: 'Branch transfers' }

export default async function PrincipalTransfers({ searchParams }: { searchParams: Promise<{ branch?: string }> }) {
  await requireRole('PRINCIPAL')
  const sp = await searchParams
  const db = await createClient()
  const [branches, selected] = await Promise.all([listBranches(db, { includeArchived: true }), principalBranch(db, sp.branch)])
  let q = db
    .from('student_branch_transfers')
    .select('id, student_id, from_department_id, to_department_id, requested_by, reason, status, created_at, decided_at, decision_note')
    .order('created_at', { ascending: false })
    .limit(200)
  if (selected) q = q.or(`from_department_id.eq.${selected.id},to_department_id.eq.${selected.id}`)
  const { data } = await q
  const ids = [...new Set((data ?? []).flatMap((t) => [t.student_id, t.requested_by].filter(Boolean) as string[]))]
  const [{ data: students }, { data: staff }] = await Promise.all([
    ids.length ? db.from('student_profiles').select('user_id, full_name, usn').in('user_id', ids) : Promise.resolve({ data: [] }),
    ids.length ? db.from('hod_profiles').select('user_id, full_name').in('user_id', ids) : Promise.resolve({ data: [] }),
  ])
  const st = new Map((students ?? []).map((s) => [s.user_id, s]))
  const who = new Map((staff ?? []).map((s) => [s.user_id, s.full_name]))
  const code = new Map(branches.map((b) => [b.id, b.code]))
  const rows: TransferRow[] = (data ?? []).map((t) => ({
    id: t.id,
    studentId: t.student_id,
    studentName: st.get(t.student_id)?.full_name ?? null,
    usn: st.get(t.student_id)?.usn ?? null,
    from: code.get(t.from_department_id) ?? '?',
    to: code.get(t.to_department_id) ?? '?',
    reason: t.reason,
    status: t.status,
    requestedBy: t.requested_by ? (who.get(t.requested_by) ?? null) : null,
    createdAt: t.created_at,
    decidedAt: t.decided_at,
    note: t.decision_note,
  }))
  return (
    <>
      <PageHeader title="Branch" accent="transfers" description="Requests from HODs to move a student to another branch. Approving moves the student and their records, and ends their current mentor assignment." />
      <TransferBoard
        pending={rows.filter((r) => r.status === 'PENDING')}
        history={rows.filter((r) => r.status !== 'PENDING')}
        branches={branches.filter((b) => b.status === 'ACTIVE').map((b) => ({ id: b.id, code: b.code, name: b.name }))}
      />
    </>
  )
}
