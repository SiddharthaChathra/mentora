import type { Metadata } from 'next'
import Link from 'next/link'
import { requireUser } from '@/server/authz'
import { createClient } from '@/server/supabase'
import { awakeFilter } from '@/lib/notifications'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/primitives'
import { FilterChips, Pagination } from '@/components/ui/navigation'
import { EmptyState } from '@/components/ui/states'
import { MarkAllRead, NotificationList, type NotificationRow } from './client'

export const metadata: Metadata = { title: 'Notifications' }
const PAGE = 30

const TYPE_GROUPS: Record<string, { label: string; prefix: string[] }> = {
  mentoring: { label: 'Mentoring', prefix: ['recommendation', 'session', 'resource', 'intervention'] },
  records: { label: 'Records', prefix: ['record', 'change_request'] },
  admin: { label: 'Account & admin', prefix: ['assignment', 'account', 'import'] },
}

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ filter?: string; page?: string }> }) {
  const actor = await requireUser()
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const db = await createClient()
  const now = new Date()
  const snoozedView = sp.filter === 'snoozed'
  let q = db.from('notifications').select('id, type, title, body, link, read_at, created_at, snoozed_until', { count: 'exact' }).eq('user_id', actor.id).order('created_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1)
  q = snoozedView ? q.gt('snoozed_until', now.toISOString()) : q.or(awakeFilter(now))
  if (sp.filter === 'unread') q = q.is('read_at', null)
  else if (sp.filter && TYPE_GROUPS[sp.filter]) q = q.or(TYPE_GROUPS[sp.filter]!.prefix.map((p) => `type.like.${p}%`).join(','))
  const [{ data, count }, { count: unread }, { count: snoozed }] = await Promise.all([
    q,
    db.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', actor.id).is('read_at', null).or(awakeFilter(now)),
    db.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', actor.id).gt('snoozed_until', now.toISOString()),
  ])
  const items = (data ?? []) as NotificationRow[]

  return (
    <>
      <PageHeader title="Notifications" description={unread ? `${unread} unread` : 'You’re all caught up.'} actions={unread ? <MarkAllRead /> : undefined} />
      <FilterChips
        className="mb-5"
        param="filter"
        label="Filter notifications"
        options={[
          { value: 'all', label: 'All' },
          { value: 'unread', label: 'Unread', count: unread ?? 0 },
          ...Object.entries(TYPE_GROUPS).map(([value, g]) => ({ value, label: g.label })),
          ...(snoozed ? [{ value: 'snoozed', label: 'Snoozed', count: snoozed }] : []),
        ]}
      />
      {items.length === 0 ? (
        <Card>
          <EmptyState illustration="no-notifications" title={sp.filter === 'unread' ? 'Nothing unread' : snoozedView ? 'Nothing snoozed' : 'No notifications yet'} description="Feedback, resources, record updates and reminders will appear here." />
        </Card>
      ) : (
        <NotificationList items={items} snoozedView={snoozedView} />
      )}
      <Pagination page={page} pageSize={PAGE} total={count ?? 0} />
      <p className="mt-6 text-sm text-ink-500">
        Choose which notifications also arrive by email in{' '}
        <Link href="/account" className="font-medium text-primary-600 hover:underline">
          Account & preferences
        </Link>
        .
      </p>
    </>
  )
}
