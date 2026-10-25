import type { Metadata } from 'next'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { loadDepartment } from '@/server/services/department'
import { PageHeader } from '@/components/ui/page-header'
import { InterventionsBoard, type InterventionRow } from '@/features/admin/interventions'

export const metadata: Metadata = { title: 'Interventions' }

export default async function HodInterventionsPage() {
  const actor = await requireRole('HOD')
  const db = await createClient()
  const { roster } = await loadDepartment(db, actor)
  const flagged = roster.filter((r) => r.risk !== 'none')
  const { data: followups } = flagged.length
    ? await db.from('intervention_followups').select('id, student_id, note, created_at').eq('status', 'OPEN').in('student_id', flagged.map((f) => f.id))
    : { data: [] }
  const fBy = new Map((followups ?? []).map((f) => [f.student_id, f]))
  const rows: InterventionRow[] = flagged
    .sort((a, b) => (b.risk === 'high' ? 1 : 0) - (a.risk === 'high' ? 1 : 0) || b.flags.length - a.flags.length)
    .map((r) => ({
      id: r.id,
      name: r.name,
      usn: r.usn,
      hasAvatar: !!r.avatarPath,
      semester: r.currentSemester,
      section: r.sectionName,
      mentorName: r.mentorName,
      cgpa: r.cgpa,
      flags: r.flags,
      risk: r.risk,
      openFollowup: fBy.get(r.id) ? { id: fBy.get(r.id)!.id, note: fBy.get(r.id)!.note, createdAt: fBy.get(r.id)!.created_at } : null,
    }))
  return (
    <>
      <PageHeader
        title="Students needing"
        accent="intervention"
        description={`${rows.length} student${rows.length === 1 ? '' : 's'} flagged by transparent rules you control in Settings. Every flag lists its reason — select students to ask their mentors to follow up.`}
      />
      <InterventionsBoard rows={rows} />
    </>
  )
}
