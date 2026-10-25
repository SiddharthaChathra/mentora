import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { listSubjects, loadStudentAcademics, pendingCorrectionTargets } from '@/server/services/academics'
import { PageHeader } from '@/components/ui/page-header'
import { SemesterView } from '@/features/academics/semester-view'

export async function generateMetadata({ params }: { params: Promise<{ semester: string }> }): Promise<Metadata> {
  return { title: `Semester ${(await params).semester}` }
}

export default async function MenteeSemesterPage({ params }: { params: Promise<{ semester: string }> }) {
  const actor = await requireRole('MENTEE')
  const no = Number((await params).semester)
  if (!Number.isInteger(no) || no < 1 || no > 12) notFound()
  const db = await createClient()
  const [academics, subjects, pending] = await Promise.all([
    loadStudentAcademics(db, actor.id, actor.departmentId),
    listSubjects(db, actor.departmentId),
    pendingCorrectionTargets(db, actor.id),
  ])
  const semester = academics.semesters.find((s) => s.semesterNo === no)
  if (!semester) notFound()
  return (
    <>
      <PageHeader
        title={`Semester ${no}`}
        breadcrumbs={[{ label: 'Academic records', href: '/mentee/academics' }, { label: `Semester ${no}` }]}
        description={semester.status === 'DRAFT' ? 'Add each subject — entries save automatically. Submit when everything matches your official result.' : 'This semester is locked. Use “Request correction” if something is wrong.'}
      />
      <SemesterView semester={semester} subjects={subjects} scheme={academics.scheme} mode="student" pendingCorrectionIds={pending} />
    </>
  )
}
