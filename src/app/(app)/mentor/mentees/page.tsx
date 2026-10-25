import type { Metadata } from 'next'
import Link from 'next/link'
import { X } from 'lucide-react'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { listMentees } from '@/server/services/people'
import { getSemesterScope } from '@/server/scope'
import { inScope } from '@/lib/scope'
import { ScopeChip } from '@/components/shell/scope-chip'
import { loadRoster, slim } from '@/server/services/roster'
import { PageHeader } from '@/components/ui/page-header'
import { RosterBrowser } from '@/features/roster/roster'
import { buttonVariants } from '@/components/ui/button'

export const metadata: Metadata = { title: 'My mentees' }

export default async function MentorMenteesPage({ searchParams }: { searchParams: Promise<{ risk?: string; action?: string; subject?: string; q?: string }> }) {
  const actor = await requireRole('MENTOR')
  const sp = await searchParams
  const db = await createClient()
  const scope = await getSemesterScope()
  const mentees = inScope(await listMentees(db, actor.id), scope)
  const full = await loadRoster(db, mentees.map((m) => m.id), actor.departmentId)
  // UX2-04 drill-down: chart bars link here with ?subject=CODE.
  const subject = sp.subject?.toUpperCase().slice(0, 20)
  const roster = (subject ? full.filter((r) => r.semesters.some((s) => s.results.some((x) => x.code === subject))) : full).map(slim)
  const recommending = sp.action === 'recommend'
  return (
    <>
      <PageHeader
        title="My"
        accent="mentees"
        description={recommending ? 'Choose a mentee to write a recommendation for.' : 'Only students actively assigned to you by your HOD appear here.'}
        actions={
          <a href="/api/exports/my-mentees?format=xlsx" download className={buttonVariants({ variant: 'secondary' })}>
            Export list
          </a>
        }
      />
      <ScopeChip scope={scope} />
      {subject && (
        <p className="mb-4 flex flex-wrap items-center gap-2 text-sm text-ink-700">
          Showing {roster.length} mentee{roster.length === 1 ? '' : 's'} who took <span className="font-semibold text-ink-900">{subject}</span>
          <Link href="/mentor/mentees" className="inline-flex h-7 items-center gap-1 rounded-full bg-primary-50 px-3 text-xs font-semibold text-primary-700 hover:bg-primary-100">
            <X className="size-3.5" /> Clear filter
          </Link>
        </p>
      )}
      <RosterBrowser
        rows={roster}
        hrefBase="/mentor/mentees"
        hrefSuffix={recommending ? '?tab=mentoring&action=recommend' : ''}
        initial={{ risk: sp.risk === 'flagged' ? 'flagged' : 'all', q: sp.q?.slice(0, 80) ?? '' }}
      />
    </>
  )
}
