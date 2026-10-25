import type { Metadata } from 'next'
import Link from 'next/link'
import { Download, Eye, FileText } from 'lucide-react'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { listMentees } from '@/server/services/people'
import { getSemesterScope } from '@/server/scope'
import { inScope } from '@/lib/scope'
import { ScopeChip } from '@/components/shell/scope-chip'
import { PageHeader } from '@/components/ui/page-header'
import { Avatar } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { Card, IconChip, Pill } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/states'

export const metadata: Metadata = { title: 'PDF reports' }

export default async function MentorReportsPage() {
  const actor = await requireRole('MENTOR')
  const db = await createClient()
  const scope = await getSemesterScope()
  const mentees = inScope(await listMentees(db, actor.id), scope)
  const ids = mentees.map((m) => m.id)
  const { data: verified } = ids.length ? await db.from('academic_semesters').select('student_id').in('student_id', ids).in('status', ['VERIFIED', 'FINALIZED']) : { data: [] }
  const count = new Map<string, number>()
  for (const v of verified ?? []) count.set(v.student_id, (count.get(v.student_id) ?? 0) + 1)
  return (
    <>
      <PageHeader title="Student" accent="reports" description="Professional, print-ready PDFs generated only from verified records and the mentoring items you mark for inclusion. Charts, insights and risk flags are never included." />
      <ScopeChip scope={scope} />
      <Card className="mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <IconChip icon={FileText} tone="brand" size="lg" />
        <div className="text-sm text-ink-700">
          <p className="font-semibold text-ink-900">What a report contains</p>
          <p className="mt-0.5">01 Student information · 02 Academic summary · 03 Semester-wise performance · 04 Mentoring records. Each download is recorded in the audit history.</p>
        </div>
      </Card>
      {mentees.length === 0 ? (
        <Card>
          <EmptyState illustration="no-mentees" title="No mentees yet" description="Reports become available once students are assigned to you." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line/70">
            {mentees.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-4 p-4 sm:px-5">
                <Avatar userId={m.id} name={m.name} hasImage={!!m.avatarPath} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink-900">{m.name ?? 'New student'}</p>
                  <p className="num text-xs text-ink-500">
                    {m.usn} {m.currentSemester ? `· Semester ${m.currentSemester}` : ''}
                  </p>
                </div>
                <Pill tone={count.get(m.id) ? 'success' : 'warning'}>{count.get(m.id) ?? 0} verified semester{count.get(m.id) === 1 ? '' : 's'}</Pill>
                <div className="flex gap-2">
                  <Link href={`/mentor/mentees/${m.id}?tab=report`} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                    <Eye /> Preview
                  </Link>
                  <a href={`/api/reports/student/${m.id}`} className={buttonVariants({ size: 'sm' })}>
                    <Download /> Download
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}
