import 'server-only'
import type { DB } from '@/server/supabase'
import { check } from '@/server/handle'
import type { PendingCorrection, PendingSemester } from '@/features/academics/verifications'
import { loadManyAcademics } from './academics'

/** Submitted semesters + correction requests visible to the caller (RLS-scoped). */
export async function loadVerificationQueues(db: DB, departmentId: string | null, opts: { history?: boolean } = {}) {
  const [{ data: sems }, { data: crs }] = await Promise.all([
    db.from('academic_semesters').select('id, student_id, semester_no, academic_year, submitted_at').eq('status', 'SUBMITTED').order('submitted_at').limit(200),
    (() => {
      let q = db.from('record_change_requests').select('*').order('created_at', { ascending: false }).limit(100)
      if (!opts.history) q = q.eq('status', 'PENDING')
      return q
    })(),
  ])
  const studentIds = [...new Set([...(sems ?? []).map((s) => s.student_id), ...(crs ?? []).map((c) => c.student_id)])]
  const { data: profiles } = studentIds.length ? await db.from('student_profiles').select('user_id, full_name, usn').in('user_id', studentIds) : { data: [] }
  const pBy = new Map((profiles ?? []).map((p) => [p.user_id, p]))
  const { byStudent } = await loadManyAcademics(db, [...new Set((sems ?? []).map((s) => s.student_id))], departmentId)

  const semesters: PendingSemester[] = (sems ?? []).map((s) => {
    const bundle = byStudent.get(s.student_id)?.find((b) => b.id === s.id)
    return {
      id: s.id,
      studentId: s.student_id,
      studentName: pBy.get(s.student_id)?.full_name ?? null,
      usn: pBy.get(s.student_id)?.usn ?? null,
      semesterNo: s.semester_no,
      academicYear: s.academic_year,
      subjects: bundle?.results.length ?? 0,
      sgpa: bundle?.sgpa.value?.sgpa ?? null,
      sgpaNote: bundle?.sgpa.reason ?? null,
      submittedAt: s.submitted_at,
    }
  })

  const semIds = [...new Set((crs ?? []).map((c) => c.academic_semester_id))]
  const resultIds = (crs ?? []).filter((c) => c.target_table === 'student_subject_results').map((c) => c.target_id)
  const [{ data: semRows }, { data: resultRows }] = await Promise.all([
    semIds.length ? db.from('academic_semesters').select('id, semester_no').in('id', semIds) : Promise.resolve({ data: [] as { id: string; semester_no: number }[] }),
    resultIds.length ? db.from('student_subject_results').select('id, subjects(code, name)').in('id', resultIds) : Promise.resolve({ data: [] as { id: string; subjects: { code: string; name: string } | null }[] }),
  ])
  const semNo = new Map((semRows ?? []).map((s) => [s.id, s.semester_no]))
  const subj = new Map(((resultRows ?? []) as { id: string; subjects: { code: string; name: string } | null }[]).map((r) => [r.id, r.subjects]))
  const corrections: PendingCorrection[] = check({ data: crs, error: null })!.map((c) => ({
    id: c.id,
    studentId: c.student_id,
    studentName: pBy.get(c.student_id)?.full_name ?? null,
    semesterNo: semNo.get(c.academic_semester_id) ?? 0,
    target: c.target_table === 'student_subject_results' ? (subj.get(c.target_id) ? `${subj.get(c.target_id)!.code} · ${subj.get(c.target_id)!.name}` : 'Subject result') : 'Semester details',
    reason: c.reason,
    current: (c.current_values ?? {}) as Record<string, unknown>,
    proposed: (c.proposed ?? {}) as Record<string, unknown>,
    createdAt: c.created_at,
    status: c.status,
    reviewNote: c.review_note,
  }))
  return { semesters, corrections }
}
