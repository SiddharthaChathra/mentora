import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { assertCanViewStudent, pageGuard, requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { StudentProfileView } from '@/features/student/profile-view'

export const metadata: Metadata = { title: 'Mentee profile' }

export default async function MentorMenteeProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireRole('MENTOR')
  const id = z.uuid().safeParse((await params).id)
  if (!id.success) notFound()
  const db = await createClient()
  // Only the ACTIVE mentor passes; a previous mentor gets /403.
  await pageGuard(() => assertCanViewStudent(actor, id.data, db))
  return <StudentProfileView db={db} actor={actor} studentId={id.data} basePath="/mentor/mentees" searchParams={await searchParams} />
}
