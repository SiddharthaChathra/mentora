import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { assertCanViewStudent, pageGuard, requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { StudentProfileView } from '@/features/student/profile-view'
import { ReadOnlyBanner } from '@/features/principal/read-only-banner'

export const metadata: Metadata = { title: 'Student profile' }

/** The existing mentee profile, read-only for the Principal (no Recommend/Schedule/Verify; PDF download allowed and audited). */
export default async function PrincipalStudentProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireRole('PRINCIPAL')
  const id = z.uuid().safeParse((await params).id)
  if (!id.success) notFound()
  const db = await createClient()
  await pageGuard(() => assertCanViewStudent(actor, id.data, db))
  return (
    <>
      <ReadOnlyBanner>Private mentor notes are never shown to the Principal.</ReadOnlyBanner>
      <StudentProfileView db={db} actor={actor} studentId={id.data} basePath="/principal/students" searchParams={await searchParams} />
    </>
  )
}
