import 'server-only'
import type { DB } from '@/server/supabase'
import { loadStudentAcademics } from '@/server/services/academics'
import { getActiveMentor, getSettings, getStudentProfile } from '@/server/services/people'
import { KIND_LABEL } from '@/lib/labels'

/** Mentor-authored kinds allowed in the PDF. Automated strengths/weaknesses never appear. */
const REPORT_KINDS = ['RECOMMENDATION', 'FEEDBACK', 'GOAL', 'ACTION_POINT'] as const

export type ReportData = Awaited<ReturnType<typeof loadReportData>>

/**
 * Everything printed in a student report — loaded ONLY from verified/finalized academic records
 * and mentoring items explicitly marked include_in_report + SHARED. Charts, insights, risk flags
 * and AI summaries are never loaded here, so they cannot leak into the PDF.
 */
export async function loadReportData(db: DB, studentId: string) {
  const profile = await getStudentProfile(db, studentId)
  if (!profile) return null
  const [academics, mentor, settings, { data: recs }] = await Promise.all([
    loadStudentAcademics(db, studentId, profile.departmentId, { verifiedOnly: true }),
    getActiveMentor(db, studentId),
    getSettings(db),
    db
      .from('mentor_recommendations')
      .select('id, kind, title, body, status, due_date, review_date, created_at')
      .eq('student_id', studentId)
      .eq('include_in_report', true)
      .eq('visibility', 'SHARED')
      .in('kind', [...REPORT_KINDS])
      .order('created_at'),
  ])

  let photo: Buffer | null = null
  if (profile.avatarPath) {
    const { data } = await db.storage.from('avatars').download(profile.avatarPath)
    if (data) {
      try {
        const sharp = (await import('sharp')).default
        photo = await sharp(Buffer.from(await data.arrayBuffer())).resize(240, 240, { fit: 'cover' }).png().toBuffer()
      } catch {
        photo = null
      }
    }
  }

  const semesters = academics.semesters.map((s) => ({
    semesterNo: s.semesterNo,
    academicYear: s.academicYear,
    status: s.status,
    sgpa: s.displaySgpa,
    sgpaNote: s.displayNote,
    creditsRegistered: s.stored?.creditsRegistered ?? s.results.reduce((a, r) => a + r.credits, 0),
    creditsEarned: s.stored?.creditsEarned ?? s.results.filter((r) => r.derivedResult === 'PASS').reduce((a, r) => a + r.credits, 0),
    rows: s.results.map((r) => ({
      name: r.name,
      code: r.code,
      mse: r.mse_marks,
      mseMax: r.mse_max,
      see: r.see_marks,
      seeMax: r.see_max,
      credits: r.credits,
      grade: r.resolvedGrade ?? r.grade,
      result: r.derivedResult,
    })),
  }))

  return {
    institution: settings.institutionName,
    generatedAt: new Date(),
    student: {
      name: profile.fullName ?? 'Student',
      usn: profile.usn,
      department: profile.departmentName,
      program: profile.program,
      semester: profile.currentSemester,
      section: profile.sectionName,
      academicYear: semesters.at(-1)?.academicYear ?? null,
      email: profile.email,
      mentor: mentor?.fullName ?? null,
      mentorDesignation: mentor?.designation ?? null,
      photo,
    },
    summary: {
      cgpa: academics.cgpa.value?.cgpa ?? null,
      cgpaNote: academics.cgpa.reason,
      creditsCompleted: semesters.reduce((a, s) => a + s.creditsEarned, 0),
      verifiedSemesters: semesters.length,
    },
    semesters,
    mentoring: (recs ?? []).map((r) => ({
      kind: KIND_LABEL[r.kind],
      title: r.title,
      body: r.body.length > 700 ? `${r.body.slice(0, 700)}…` : r.body,
      status: r.status,
      dueDate: r.due_date,
      reviewDate: r.review_date,
      createdAt: r.created_at,
    })),
  }
}
