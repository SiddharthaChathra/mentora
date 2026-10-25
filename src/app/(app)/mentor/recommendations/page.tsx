import type { Metadata } from 'next'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { listMentees } from '@/server/services/people'
import { getSemesterScope } from '@/server/scope'
import { inScope } from '@/lib/scope'
import { ScopeChip } from '@/components/shell/scope-chip'
import { CATEGORY_LABEL, KIND_LABEL } from '@/lib/labels'
import { fmtDate, fmtRelative } from '@/lib/utils'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/primitives'
import { FilterChips, Pagination } from '@/components/ui/navigation'
import { Pill, StatusPill } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/states'
import { buttonVariants } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Recommendations' }
const PAGE = 20

export default async function MentorRecommendationsPage({ searchParams }: { searchParams: Promise<{ status?: string; kind?: string; page?: string }> }) {
  const actor = await requireRole('MENTOR')
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const db = await createClient()
  const scope = await getSemesterScope()
  const mentees = inScope(await listMentees(db, actor.id), scope)
  const ids = mentees.map((m) => m.id)
  const names = new Map(mentees.map((m) => [m.id, m.name]))
  const today = new Date().toISOString().slice(0, 10)

  let q = db
    .from('mentor_recommendations')
    .select('id, student_id, kind, category, title, status, due_date, review_date, visibility, created_at', { count: 'exact' })
    .in('student_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1)
  if (sp.status === 'due') q = q.neq('status', 'COMPLETED').lte('review_date', today)
  else if (sp.status && sp.status !== 'all') q = q.eq('status', sp.status as 'PENDING')
  if (sp.kind && sp.kind !== 'all') q = q.eq('kind', sp.kind as 'GOAL')
  const { data, count } = await q

  return (
    <>
      <PageHeader
        title="Recommendations &"
        accent="follow-ups"
        description="Everything you’ve shared with your current mentees, with status and dates."
        actions={
          <Link href="/mentor/mentees?action=recommend" className={buttonVariants()}>
            New recommendation
          </Link>
        }
      />
      <ScopeChip scope={scope} />
      <div className="mb-5 space-y-3">
        <FilterChips
          param="status"
          label="Status"
          options={[
            { value: 'all', label: 'All' },
            { value: 'due', label: 'Follow-up due' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'IN_PROGRESS', label: 'In progress' },
            { value: 'COMPLETED', label: 'Completed' },
          ]}
        />
        <FilterChips param="kind" label="Type" options={[{ value: 'all', label: 'All types' }, ...Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label }))]} />
      </div>
      {!data?.length ? (
        <Card>
          <EmptyState illustration="no-feedback" title="Nothing here" description="Try another filter, or write a recommendation for a mentee." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line/70">
            {data.map((r) => {
              const overdue = r.status !== 'COMPLETED' && (r.review_date ?? r.due_date) && (r.review_date ?? r.due_date)! <= today
              return (
                <li key={r.id} className="relative flex flex-col gap-2 p-4 hover:bg-surface-muted sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <Link href={`/mentor/mentees/${r.student_id}?tab=mentoring&item=${r.id}`} className="font-medium text-ink-900 after:absolute after:inset-0 hover:text-primary-700">
                      {r.title}
                    </Link>
                    <p className="mt-0.5 text-sm text-ink-500">
                      {names.get(r.student_id) ?? 'Student'} · {KIND_LABEL[r.kind]} · {CATEGORY_LABEL[r.category]} · {fmtRelative(r.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {r.visibility === 'PRIVATE_MENTOR' && (
                      <Pill>
                        <Lock className="size-3" /> Private
                      </Pill>
                    )}
                    {r.due_date && <Pill tone={overdue ? 'danger' : 'outline'}>Due {fmtDate(r.due_date, 'd MMM')}</Pill>}
                    <StatusPill status={r.status} />
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
      <Pagination page={page} pageSize={PAGE} total={count ?? 0} />
    </>
  )
}
