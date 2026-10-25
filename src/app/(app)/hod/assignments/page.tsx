import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { loadDepartment } from '@/server/services/department'
import { getSemesterScope } from '@/server/scope'
import { ScopeChip } from '@/components/shell/scope-chip'
import { PageHeader } from '@/components/ui/page-header'
import { AssignmentsWorkspace, type HistoryItem } from '@/features/assignments/workspace'

export const metadata: Metadata = { title: 'Assignments' }

export default async function HodAssignmentsPage() {
  const actor = await requireRole('HOD')
  const db = await createClient()
  const scope = await getSemesterScope()
  const { roster, mentors } = await loadDepartment(db, actor, scope)
  const { data: hist } = await db.from('mentor_assignments').select('id, student_id, mentor_id, started_at, ended_at, reason, end_reason').order('started_at', { ascending: false }).limit(200)
  const sName = new Map(roster.map((r) => [r.id, r.name]))
  const mName = new Map(mentors.map((m) => [m.id, m.name ?? m.email]))
  const history: HistoryItem[] = (hist ?? []).map((h) => ({
    id: h.id,
    studentId: h.student_id,
    studentName: sName.get(h.student_id) ?? null,
    mentorName: mName.get(h.mentor_id) ?? null,
    startedAt: h.started_at,
    endedAt: h.ended_at,
    reason: h.reason,
    endReason: h.end_reason,
  }))
  const unassigned = roster.filter((r) => !r.mentorId).length
  return (
    <>
      <PageHeader
        title="Mentor"
        accent="assignments"
        description={`Drag students between mentors, or select several and reassign in one step. ${unassigned ? `${unassigned} student${unassigned === 1 ? ' is' : 's are'} waiting for a mentor.` : 'Every student has a mentor.'}`}
      />
      <ScopeChip scope={scope} />
      <AssignmentsWorkspace
        students={roster.map((r) => ({ id: r.id, name: r.name, usn: r.usn, semester: r.currentSemester, section: r.sectionName, mentorId: r.mentorId, risk: r.risk, hasAvatar: !!r.avatarPath }))}
        mentors={mentors.filter((m) => m.status === 'ACTIVE').map((m) => ({ id: m.id, name: m.name ?? m.email, capacity: m.capacity, hasAvatar: !!m.avatarPath }))}
        history={history}
      />
    </>
  )
}
