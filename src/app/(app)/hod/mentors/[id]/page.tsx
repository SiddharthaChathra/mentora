import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { Mail, Phone } from 'lucide-react'
import { requireRole } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { loadDepartment } from '@/server/services/department'
import { getSemesterScope } from '@/server/scope'
import { ScopeChip } from '@/components/shell/scope-chip'
import { listSessions } from '@/server/services/mentoring'
import { fmtRelative } from '@/lib/utils'
import { PageHeader } from '@/components/ui/page-header'
import { Avatar } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { PastelStatTile } from '@/components/ui/display'
import { Card, CardBody, CardHeader, DefinitionList, Pill, StatusPill } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/states'
import { MenteeCard } from '@/features/roster/roster'
import { slim } from '@/server/services/roster'
import { CapacityEditor } from './capacity-editor'

export const metadata: Metadata = { title: 'Mentor profile' }

export default async function HodMentorPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole('HOD')
  const id = z.uuid().safeParse((await params).id)
  if (!id.success) notFound()
  const db = await createClient()
  const scope = await getSemesterScope()
  const { mentors, roster } = await loadDepartment(db, actor, scope)
  const m = mentors.find((x) => x.id === id.data)
  if (!m) notFound()
  const [{ data: profile }, sessions, { count: recCount }] = await Promise.all([
    db.from('mentor_profiles').select('*').eq('user_id', m.id).maybeSingle(),
    listSessions(db, { mentorId: m.id, limit: 50, order: 'desc' }),
    db.from('mentor_recommendations').select('id', { count: 'exact', head: true }).eq('mentor_id', m.id),
  ])
  const mentees = roster.filter((r) => m.mentees.includes(r.id))
  const completed = sessions.filter((s) => s.status === 'COMPLETED').length
  return (
    <>
      <PageHeader
        title={m.name ?? m.email}
        breadcrumbs={[{ label: 'Mentors', href: '/hod/mentors' }, { label: m.name ?? m.email }]}
        description={[profile?.designation, profile?.faculty_id].filter(Boolean).join(' · ')}
        actions={
          <Link href={`/hod/assignments?mentor=${m.id}`} className={buttonVariants()}>
            Assign mentees
          </Link>
        }
      />
      <ScopeChip scope={scope} />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardBody>
            <div className="flex items-center gap-4">
              <Avatar userId={m.id} name={m.name} hasImage={!!m.avatarPath} size="lg" />
              <div>
                <StatusPill status={m.status} />
                <p className="mt-1 text-sm text-ink-500">{m.email}</p>
              </div>
            </div>
            <DefinitionList
              className="mt-6 sm:grid-cols-1"
              items={[
                { label: 'Official email', value: profile?.official_email ? <a href={`mailto:${profile.official_email}`} className="inline-flex items-center gap-1.5 hover:text-primary-700"><Mail className="size-3.5" />{profile.official_email}</a> : null },
                { label: 'Phone', value: profile?.phone ? <a href={`tel:${profile.phone}`} className="inline-flex items-center gap-1.5 hover:text-primary-700"><Phone className="size-3.5" />{profile.phone}</a> : null },
                { label: 'Expertise', value: m.expertise.length ? <span className="flex flex-wrap gap-1">{m.expertise.map((e) => <Pill key={e} tone="brand">{e}</Pill>)}</span> : null },
              ]}
            />
            <div className="mt-6 border-t border-line pt-5">
              <CapacityEditor mentorId={m.id} capacity={m.capacity} />
            </div>
          </CardBody>
        </Card>
        <div className="space-y-4">
          <div className="grid gap-3 rounded-[24px] bg-surface p-3 shadow-2 sm:grid-cols-3 sm:gap-4 sm:p-4">
            <PastelStatTile tile="blue" label="Mentees" value={mentees.length} helper={`Capacity ${m.capacity}`} />
            <PastelStatTile tile="lilac" label="Recommendations" value={recCount ?? 0} helper={`${m.activity30} actions in 30 days`} />
            <PastelStatTile tile="green" label="Sessions held" value={completed} helper={m.lastActivity ? `Last active ${fmtRelative(m.lastActivity)}` : 'No activity yet'} />
          </div>
          <Card>
            <CardHeader title="Assigned mentees" description="Mentee profiles are opened as HOD (read-only mentoring)." />
            <CardBody>
              {mentees.length ? (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {mentees.map((r) => (
                    <li key={r.id}>
                      <MenteeCard m={slim(r)} href={`/hod/students/${r.id}`} />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState compact illustration="no-mentees" title="No mentees assigned" description="Use Assignments to allocate students." />
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  )
}
