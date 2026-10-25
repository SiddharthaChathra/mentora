import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { assertCanViewStudent, pageGuard, requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { StudentProfileView } from '@/features/student/profile-view'

export const metadata: Metadata = { title: 'Student profile' }

export default async function HodStudentProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireRole('HOD')
  const id = z.uuid().safeParse((await params).id)
  if (!id.success) notFound()
  const db = await createClient()
  await pageGuard(() => assertCanViewStudent(actor, id.data, db))
  return <StudentProfileView db={db} actor={actor} studentId={id.data} basePath="/hod/students" searchParams={await searchParams} />
}
